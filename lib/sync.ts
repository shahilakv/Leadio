import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sheets as defaultSheets, oauthSheets, SheetError } from '@/lib/google/sheets';
import { decrypt } from '@/lib/crypto';
import { rowsToLeads } from '@/lib/sheets/rows';
import type { FieldMap } from '@/lib/leads';

// Pulls one connected sheet tab into the leads table.
// Only sheet-derived columns are written, so call results (status, follow-up, attempts) are never overwritten.
// Leads removed from the sheet are kept in the app (their call history matters).

export const SYNC_EVERY_MS = 45_000;
const CHUNK = 500;

export type SyncResult = { sourceId: string; ok: boolean; total?: number; added?: number; error?: string; skipped?: boolean };

type Source = { id: string; company_id: string; spreadsheet_id: string; tab_title: string; connection: 'service_account' | 'oauth'; field_map: FieldMap; card_fields: string[]; companies: { country_code: string } | null };

/**
 * Sync one source. With `force: false` it first "claims" the source and skips it if it was synced
 * in the last 45 seconds, so many open phones don't hammer Google.
 */
export async function syncSource(sourceId: string, { force = false, sheets = defaultSheets } = {}): Promise<SyncResult> {
  const db = supabaseAdmin();
  const now = new Date();

  if (!force) {
    const cutoff = new Date(+now - SYNC_EVERY_MS).toISOString();
    const { data: claimed } = await db.from('sheet_sources')
      .update({ last_synced_at: now.toISOString() })
      .eq('id', sourceId)
      .or(`last_synced_at.is.null,last_synced_at.lt.${cutoff}`)
      .select('id');
    if (!claimed?.length) return { sourceId, ok: true, skipped: true };
  }

  const { data: src, error } = await db.from('sheet_sources')
    .select('id, company_id, spreadsheet_id, tab_title, connection, field_map, card_fields, companies(country_code)')
    .eq('id', sourceId).single<Source>();
  if (error || !src) return { sourceId, ok: false, error: 'Sheet connection not found' };

  try {
    if (src.connection === 'oauth' && sheets === defaultSheets) {
      const { data: sec } = await db.from('source_secrets').select('token_enc').eq('source_id', src.id).maybeSingle();
      if (!sec) throw new Error('Google access is missing. The owner needs to connect Google again.');
      sheets = oauthSheets(decrypt(sec.token_enc));
    }
    const values = await sheets.values(src.spreadsheet_id, src.tab_title);
    const rows = rowsToLeads(values, src.field_map || {}, src.card_fields || [], src.companies?.country_code || '91');

    const before = await db.from('leads').select('id', { count: 'exact', head: true }).eq('source_id', src.id);
    for (let i = 0; i < rows.length; i += CHUNK) {
      const batch = rows.slice(i, i + CHUNK).map(r => ({ ...r, company_id: src.company_id, source_id: src.id }));
      const { error: upErr } = await db.from('leads').upsert(batch, { onConflict: 'source_id,external_id' });
      if (upErr) throw new Error(upErr.message);
    }
    const after = await db.from('leads').select('id', { count: 'exact', head: true }).eq('source_id', src.id);

    await db.from('sheet_sources').update({ last_synced_at: new Date().toISOString(), last_error: null }).eq('id', src.id);
    return { sourceId, ok: true, total: rows.length, added: Math.max(0, (after.count ?? 0) - (before.count ?? 0)) };
  } catch (e) {
    const msg = e instanceof SheetError || e instanceof Error ? e.message : 'Sync failed';
    await db.from('sheet_sources').update({ last_error: msg.slice(0, 500) }).eq('id', src.id);
    return { sourceId, ok: false, error: msg };
  }
}

// Sync every sheet of a company (used when the app opens and every minute while it's open).
export async function syncCompany(companyId: string, opts: { force?: boolean } = {}): Promise<SyncResult[]> {
  const db = supabaseAdmin();
  const { data } = await db.from('sheet_sources').select('id').eq('company_id', companyId);
  return Promise.all((data || []).map(s => syncSource(s.id, opts)));
}
