'use server';
import { activeCompany } from '@/lib/company';
import { supabaseServer } from '@/lib/supabase/server';
import { sheets, SheetError } from '@/lib/google/sheets';
import { parseSheetUrl, usableHeaders, TEST_LEAD } from '@/lib/sheets/rows';
import { guessFieldMap, ROLES, type FieldMap } from '@/lib/leads';
import { syncSource } from '@/lib/sync';

type Fail = { error: string };

async function ownerCompany() {
  const c = await activeCompany();
  if (!c) throw new Error('Please log in again.');
  if (c.role !== 'owner') throw new Error('Only the company owner can connect sheets.');
  return c;
}
const fail = (e: unknown): Fail => ({ error: e instanceof SheetError || e instanceof Error ? e.message : 'Something went wrong. Try again.' });

export type CheckResult = { id: string; title: string; tabs: string[]; tab: string } | Fail;

// Step 1: is this a sheet link, and can our robot open it?
export async function checkSheet(url: string): Promise<CheckResult> {
  try {
    await ownerCompany();
    const p = parseSheetUrl(url);
    if (!p) return { error: 'That doesn’t look like a Google Sheets link. Copy it from your browser’s address bar.' };
    const meta = await sheets.meta(p.id);
    if (!meta.tabs.length) return { error: 'This sheet has no tabs.' };
    const byGid = p.gid ? meta.tabs.find(t => String(t.gid) === p.gid) : undefined;
    return { id: p.id, title: meta.title, tabs: meta.tabs.map(t => t.title), tab: (byGid ?? meta.tabs[0]).title };
  } catch (e) { return fail(e); }
}

export type InspectResult = { headers: string[]; samples: Record<string, string>; guess: FieldMap; rows: number } | Fail;

// Step 2: headers and an example value for each, plus our best guess of name/phone/etc.
export async function inspectTab(id: string, tab: string): Promise<InspectResult> {
  try {
    await ownerCompany();
    const values = await sheets.values(id, tab, '1:30');
    const all = (values[0] || []).map(h => h.trim());
    const headers = usableHeaders(all);
    if (!headers.length) return { error: 'Row 1 of this tab is empty. The first row must hold the column names.' };
    const data = values.slice(1).filter(r => r.some(v => v.trim()) && !r.some(v => TEST_LEAD.test(v)));
    const samples: Record<string, string> = {};
    for (const h of headers) {
      const j = all.indexOf(h);
      samples[h] = data.map(r => (r[j] || '').trim()).find(Boolean) || '';
    }
    const g = guessFieldMap(headers);
    const guess = Object.fromEntries(Object.entries(g).filter(([, v]) => v)) as FieldMap;
    return { headers, samples, guess, rows: data.length };
  } catch (e) { return fail(e); }
}

export type ConnectResult = { ok: true; total: number } | Fail;

// Step 3: save the connection and fetch the leads.
export async function connectSheet(input: { id: string; tab: string; title: string; map: FieldMap; cardFields: string[] }): Promise<ConnectResult> {
  try {
    const company = await ownerCompany();
    const values = await sheets.values(input.id, input.tab, '1:1');
    const headers = usableHeaders(values[0] || []);
    const map: FieldMap = {};
    for (const r of ROLES) { const h = input.map[r]; if (h && headers.includes(h)) map[r] = h; }
    if (!map.name || !map.phone) return { error: 'Choose which column has the name and which has the phone number.' };
    const cardFields = Array.from(new Set(input.cardFields.filter(h => headers.includes(h)))).slice(0, 8);

    const sb = await supabaseServer();
    const { data, error } = await sb.from('sheet_sources').insert({
      company_id: company.id, label: input.title.slice(0, 120), spreadsheet_id: input.id, tab_title: input.tab,
      connection: 'service_account', field_map: map, card_fields: cardFields,
    }).select('id').single();
    if (error || !data) return { error: error?.message || 'Could not save the connection.' };

    const r = await syncSource(data.id, { force: true });
    if (!r.ok) return { error: `Connected, but fetching leads failed: ${r.error}` };
    return { ok: true, total: r.total ?? 0 };
  } catch (e) { return fail(e); }
}
