// Turning raw Google Sheet values into leads. Pure functions: used by sync, tested without Google.
import { createHash } from 'node:crypto';
import { cleanPhone, parseDate, type FieldMap } from '@/lib/leads';

// Meta's ad/form bookkeeping columns: never shown, never stored.
export const SKIP_COLS = /^(ad_id|ad_name|adset_id|adset_name|campaign_id|form_id|form_name|is_organic|platform|lead_status|inbox_url)$/i;
// Meta's "<test lead: dummy data for ...>" rows.
export const TEST_LEAD = /^(p:)?<test lead/i;
// Columns that hold Meta's unique lead id.
export const ID_COL = /^(id|lead_?id)$/i;

export const NEW_STATUS_HEADER = 'Leadio Status';

/**
 * Where to write each lead's status. Rows are found by Meta's id column, so sorting the sheet is safe.
 * Leads without an id (hash ids) fall back to their remembered row, but only if the name there still matches.
 * Returns external_id -> A1 cell, e.g. "Q12". Leads that can't be found safely are left out.
 */
export function statusCells(values: string[][], statusHeader: string, leads: { external_id: string; sheet_row: number | null; name: string }[], nameHeader?: string): Map<string, string> {
  const out = new Map<string, string>();
  const headers = (values[0] || []).map(h => String(h ?? '').trim());
  const sc = headers.indexOf(statusHeader);
  if (sc < 0) return out;
  const L = col(sc + 1);
  const idCol = headers.findIndex(h => ID_COL.test(h));
  const nameCol = nameHeader ? headers.indexOf(nameHeader) : -1;
  const byId = new Map<string, number>();
  if (idCol > -1) values.forEach((r, i) => { if (i > 0 && r?.[idCol]) byId.set(String(r[idCol]).trim(), i + 1); });
  for (const l of leads) {
    let row = byId.get(l.external_id);
    if (!row && l.sheet_row && l.sheet_row > 1 && nameCol > -1) {
      const cell = String(values[l.sheet_row - 1]?.[nameCol] ?? '').trim();
      if (cell && cell === l.name) row = l.sheet_row;
    }
    if (row) out.set(l.external_id, `${L}${row}`);
  }
  return out;
}

// 1 -> A, 27 -> AA
export function col(n: number): string {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

// "https://docs.google.com/spreadsheets/d/<ID>/edit#gid=0" -> { id, gid }. Also accepts a bare id.
export function parseSheetUrl(input: string): { id: string; gid?: string } | null {
  const s = String(input || '').trim();
  const m = /\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/.exec(s);
  const id = m ? m[1] : /^[a-zA-Z0-9_-]{25,}$/.test(s) ? s : '';
  if (!id) return null;
  const gid = /[#&?]gid=(\d+)/.exec(s)?.[1];
  return gid ? { id, gid } : { id };
}

// Headers the user may choose from (Meta bookkeeping columns removed).
export const usableHeaders = (headers: string[]) => headers.map(h => String(h).trim()).filter(h => h && !SKIP_COLS.test(h));

export type LeadRow = {
  external_id: string;
  sheet_row: number;
  name: string;
  phone: string;
  lead_time: string | null;
  campaign: string;
  fields: Record<string, string>;
};

/**
 * values: the tab's rows as returned by the Sheets API (row 1 = headers).
 * Returns one LeadRow per real lead. Empty rows, Meta test leads and rows without name and phone are skipped.
 * external_id is Meta's id when there is one, else a hash of the row's mapped values (stable across re-sorting).
 */
export function rowsToLeads(values: unknown[][], map: FieldMap, cardFields: string[], countryCode = '91'): LeadRow[] {
  if (!values.length) return [];
  const headers = (values[0] || []).map(h => String(h ?? '').trim());
  const idx = (h?: string) => (h ? headers.indexOf(h) : -1);
  const idCol = headers.findIndex(h => ID_COL.test(h));
  const keep = Array.from(new Set([map.name, map.phone, map.time, map.campaign, map.city, map.type, ...cardFields]
    .filter((h): h is string => !!h && headers.includes(h) && !SKIP_COLS.test(h))));
  const out: LeadRow[] = [];
  const seen = new Set<string>();

  for (let i = 1; i < values.length; i++) {
    const r = (values[i] || []).map(v => (v == null ? '' : String(v)));
    if (!r.some(v => v.trim() !== '')) continue;
    if (r.some(v => TEST_LEAD.test(v))) continue;
    const get = (h?: string) => { const j = idx(h); return j > -1 ? (r[j] ?? '').trim() : ''; };
    const name = get(map.name), phoneRaw = get(map.phone);
    if (!name && !phoneRaw) continue;

    const fields: Record<string, string> = {};
    for (const h of keep) fields[h] = get(h);

    let external_id = idCol > -1 ? (r[idCol] ?? '').trim() : '';
    if (!external_id) external_id = 'h:' + createHash('sha1').update(JSON.stringify([name, phoneRaw, get(map.time)])).digest('hex').slice(0, 20);
    if (seen.has(external_id)) continue;           // duplicate row in the sheet: keep the first
    seen.add(external_id);

    const t = parseDate(get(map.time));
    out.push({
      external_id,
      sheet_row: i + 1,
      name,
      phone: cleanPhone(phoneRaw, countryCode) || phoneRaw.replace(/^p:/i, ''),
      lead_time: t ? t.toISOString() : null,
      campaign: get(map.campaign),
      fields,
    });
  }
  return out;
}
