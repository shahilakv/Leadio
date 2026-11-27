import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sheets as robotSheets, oauthSheets } from '@/lib/google/sheets';
import { decrypt } from '@/lib/crypto';
import { statusCells } from '@/lib/sheets/rows';
import type { FieldMap } from '@/lib/leads';

// Optional: copy statuses from Leadio into the company's chosen sheet column.
// Leadio stays the source of truth: the column is written, never read back.

type Src = { id: string; spreadsheet_id: string; tab_title: string; connection: 'service_account' | 'oauth'; status_column: string | null; field_map: FieldMap };

export async function sheetsForSource(src: { id: string; connection: string }) {
  if (src.connection !== 'oauth') return robotSheets;
  const { data: sec } = await supabaseAdmin().from('source_secrets').select('token_enc').eq('source_id', src.id).maybeSingle();
  if (!sec) throw new Error('Google access is missing. The owner needs to connect Google again.');
  return oauthSheets(decrypt(sec.token_enc));
}

/**
 * Write statuses for some leads of one source (or all of them when leadIds is omitted).
 * Never throws: problems are saved on the source as last_error and shown in Settings.
 */
export async function writeStatuses(sourceId: string, leadIds?: string[]): Promise<{ ok: boolean; written: number; error?: string }> {
  const db = supabaseAdmin();
  try {
    const { data: src } = await db.from('sheet_sources')
      .select('id, spreadsheet_id, tab_title, connection, status_column, field_map').eq('id', sourceId).single<Src>();
    if (!src?.status_column) return { ok: true, written: 0 };

    let q = db.from('leads').select('id, external_id, sheet_row, name, status').eq('source_id', sourceId);
    if (leadIds?.length) q = q.in('id', leadIds);
    const { data: leads } = await q.limit(20000);
    if (!leads?.length) return { ok: true, written: 0 };

    const sheets = await sheetsForSource(src);
    const values = await sheets.values(src.spreadsheet_id, src.tab_title);
    const cells = statusCells(values, src.status_column, leads, src.field_map?.name);
    if (!values[0]?.map(h => h.trim()).includes(src.status_column)) throw new Error(`The “${src.status_column}” column is no longer in the sheet. Choose the status column again in Settings.`);

    const writes = leads.flatMap(l => { const a1 = cells.get(l.external_id); return a1 ? [{ a1, value: l.status }] : []; });
    for (let i = 0; i < writes.length; i += 500) await sheets.writeCells(src.spreadsheet_id, src.tab_title, writes.slice(i, i + 500));
    return { ok: true, written: writes.length };
  } catch (e) {
    const msg = (e instanceof Error ? e.message : 'Could not write the status to the sheet.').slice(0, 500);
    await db.from('sheet_sources').update({ last_error: 'Status write-back: ' + msg }).eq('id', sourceId);
    return { ok: false, written: 0, error: msg };
  }
}

// After a status change: find the lead's source and write just that row.
export async function writeLeadStatus(leadId: string) {
  const { data } = await supabaseAdmin().from('leads').select('source_id, sheet_sources(status_column)').eq('id', leadId).maybeSingle();
  const col = (data?.sheet_sources as unknown as { status_column: string | null } | null)?.status_column;
  if (data && col) await writeStatuses(data.source_id, [leadId]);
}
