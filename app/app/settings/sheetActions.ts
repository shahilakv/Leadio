'use server';
import { revalidatePath } from 'next/cache';
import { activeCompany } from '@/lib/company';
import { supabaseServer } from '@/lib/supabase/server';
import { syncCompany } from '@/lib/sync';
import { sheetsForSource, writeStatuses } from '@/lib/writeback';
import { col, NEW_STATUS_HEADER } from '@/lib/sheets/rows';

type Res<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const fail = (e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : 'Something went wrong.' });

// "Sync now": fetch new rows from every sheet right away (any team member).
export async function syncNow(): Promise<Res<{ added: number; total: number }>> {
  try {
    const c = await activeCompany();
    if (!c) throw new Error('Please log in again.');
    const rs = await syncCompany(c.id, { force: true });
    const bad = rs.find(r => !r.ok);
    revalidatePath('/app', 'layout');
    if (bad) return { ok: false, error: bad.error || 'Sync failed' };
    return { ok: true, added: rs.reduce((n, r) => n + (r.added || 0), 0), total: rs.reduce((n, r) => n + (r.total || 0), 0) };
  } catch (e) { return fail(e); }
}

async function ownedSource(sourceId: string) {
  const c = await activeCompany();
  if (!c || c.role !== 'owner') throw new Error('Only the owner can change sheet settings.');
  const sb = await supabaseServer();
  const { data } = await sb.from('sheet_sources').select('id, spreadsheet_id, tab_title, connection').eq('id', sourceId).eq('company_id', c.id).maybeSingle();
  if (!data) throw new Error('Sheet not found.');
  return { sb, src: data };
}

// Column names of the sheet, for the "status column" dropdown.
export async function sheetHeaders(sourceId: string): Promise<Res<{ headers: string[] }>> {
  try {
    const { src } = await ownedSource(sourceId);
    const values = await (await sheetsForSource(src)).values(src.spreadsheet_id, src.tab_title, '1:1');
    return { ok: true, headers: (values[0] || []).map(h => h.trim()).filter(Boolean) };
  } catch (e) { return fail(e); }
}

/**
 * Turn status write-back on (existing column, or '__new__' to add a "Lead Desk Status" column) or off ('').
 * Turning it on also writes every lead's current status once.
 */
export async function setStatusColumn(sourceId: string, choice: string): Promise<Res<{ written: number; column: string | null }>> {
  try {
    const { sb, src } = await ownedSource(sourceId);
    if (!choice) {
      const { error } = await sb.from('sheet_sources').update({ status_column: null }).eq('id', sourceId);
      if (error) throw new Error(error.message);
      revalidatePath('/app/settings');
      return { ok: true, written: 0, column: null };
    }
    const sheets = await sheetsForSource(src);
    const headers = ((await sheets.values(src.spreadsheet_id, src.tab_title, '1:1'))[0] || []).map(h => h.trim());
    let column = choice;
    if (choice === '__new__') {
      column = NEW_STATUS_HEADER;
      if (!headers.includes(column)) await sheets.writeCells(src.spreadsheet_id, src.tab_title, [{ a1: `${col(headers.length + 1)}1`, value: column }]);
    } else if (!headers.includes(choice)) {
      throw new Error('That column isn’t in the sheet any more.');
    }
    const { error } = await sb.from('sheet_sources').update({ status_column: column, last_error: null }).eq('id', sourceId);
    if (error) throw new Error(error.message);
    const r = await writeStatuses(sourceId);
    if (!r.ok) {
      await sb.from('sheet_sources').update({ status_column: null }).eq('id', sourceId);
      throw new Error(r.error || 'Could not write to the sheet.');
    }
    revalidatePath('/app/settings');
    return { ok: true, written: r.written, column };
  } catch (e) { return fail(e); }
}
