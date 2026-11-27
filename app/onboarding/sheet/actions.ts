'use server';
import { activeCompany } from '@/lib/company';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sheets as robotSheets, oauthSheets, SheetError } from '@/lib/google/sheets';
import { accessToken } from '@/lib/google/oauth';
import { getPending, clearPending } from '@/lib/google/pending';
import { encrypt } from '@/lib/crypto';
import { parseSheetUrl, usableHeaders, TEST_LEAD } from '@/lib/sheets/rows';
import { guessFieldMap, ROLES, type FieldMap } from '@/lib/leads';
import { syncSource } from '@/lib/sync';

// via 'link'   = the company shared the sheet with our robot email and pasted the URL.
// via 'google' = the owner used "Connect Google" and picked the sheet in the Google Picker.
export type Via = 'link' | 'google';
type Fail = { error: string };

async function ownerCompany() {
  const c = await activeCompany();
  if (!c) throw new Error('Please log in again.');
  if (c.role !== 'owner') throw new Error('Only the company owner can connect sheets.');
  return c;
}
async function sheetsFor(via: Via) {
  if (via === 'link') return robotSheets;
  const token = await getPending();
  if (!token) throw new Error('Your Google connection timed out. Tap “Connect Google” again.');
  return oauthSheets(token);
}
const fail = (e: unknown): Fail => ({ error: e instanceof SheetError || e instanceof Error ? e.message : 'Something went wrong. Try again.' });

// For the Google Picker in the browser: a short-lived access token plus the public picker keys.
export async function pickerConfig(): Promise<{ token: string; apiKey: string; appId: string } | Fail> {
  try {
    await ownerCompany();
    const refresh = await getPending();
    if (!refresh) return { error: 'Your Google connection timed out. Tap “Connect Google” again.' };
    return { token: await accessToken(refresh), apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '', appId: process.env.NEXT_PUBLIC_GOOGLE_APP_ID || '' };
  } catch (e) { return fail(e); }
}

export type CheckResult = { id: string; title: string; tabs: string[]; tab: string } | Fail;

// Step 1: is this a sheet, and can we open it?
export async function checkSheet(urlOrId: string, via: Via = 'link'): Promise<CheckResult> {
  try {
    await ownerCompany();
    const p = parseSheetUrl(urlOrId);
    if (!p) return { error: 'That doesn’t look like a Google Sheets link. Copy it from your browser’s address bar.' };
    const meta = await (await sheetsFor(via)).meta(p.id);
    if (!meta.tabs.length) return { error: 'This sheet has no tabs.' };
    const byGid = p.gid ? meta.tabs.find(t => String(t.gid) === p.gid) : undefined;
    return { id: p.id, title: meta.title, tabs: meta.tabs.map(t => t.title), tab: (byGid ?? meta.tabs[0]).title };
  } catch (e) { return fail(e); }
}

export type InspectResult = { headers: string[]; samples: Record<string, string>; guess: FieldMap; rows: number } | Fail;

// Step 2: headers and an example value for each, plus our best guess of name/phone/etc.
export async function inspectTab(id: string, tab: string, via: Via = 'link'): Promise<InspectResult> {
  try {
    await ownerCompany();
    const values = await (await sheetsFor(via)).values(id, tab, '1:30');
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

// Step 3: save the connection (and, for Google, the encrypted token) and fetch the leads.
export async function connectSheet(input: { id: string; tab: string; title: string; map: FieldMap; cardFields: string[]; via?: Via }): Promise<ConnectResult> {
  try {
    const company = await ownerCompany();
    const via: Via = input.via === 'google' ? 'google' : 'link';
    const refresh = via === 'google' ? await getPending() : null;
    if (via === 'google' && !refresh) return { error: 'Your Google connection timed out. Tap “Connect Google” again.' };

    const values = await (await sheetsFor(via)).values(input.id, input.tab, '1:1');
    const headers = usableHeaders(values[0] || []);
    const map: FieldMap = {};
    for (const r of ROLES) { const h = input.map[r]; if (h && headers.includes(h)) map[r] = h; }
    if (!map.name || !map.phone) return { error: 'Choose which column has the name and which has the phone number.' };
    const cardFields = Array.from(new Set(input.cardFields.filter(h => headers.includes(h)))).slice(0, 8);

    const sb = await supabaseServer();
    const { data: me } = await sb.auth.getUser();
    const { data, error } = await sb.from('sheet_sources').insert({
      company_id: company.id, label: input.title.slice(0, 120), spreadsheet_id: input.id, tab_title: input.tab,
      connection: via === 'google' ? 'oauth' : 'service_account', oauth_owner: via === 'google' ? me.user?.id : null,
      field_map: map, card_fields: cardFields,
    }).select('id').single();
    if (error || !data) return { error: error?.message || 'Could not save the connection.' };

    if (refresh) {
      const { error: sErr } = await supabaseAdmin().from('source_secrets').upsert({ source_id: data.id, token_enc: encrypt(refresh), updated_at: new Date().toISOString() });
      if (sErr) {
        await sb.from('sheet_sources').delete().eq('id', data.id);
        return { error: 'Could not save the Google connection. Try again.' };
      }
      await clearPending();
    }

    const r = await syncSource(data.id, { force: true });
    if (!r.ok) return { error: `Connected, but fetching leads failed: ${r.error}` };
    return { ok: true, total: r.total ?? 0 };
  } catch (e) { return fail(e); }
}
