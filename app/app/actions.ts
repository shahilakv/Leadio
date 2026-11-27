'use server';
import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { writeLeadStatus } from '@/lib/writeback';
import { supabaseServer } from '@/lib/supabase/server';
import { activeCompany } from '@/lib/company';
import { STATUSES } from '@/lib/leads';

// Everything here runs as the signed-in user: Row Level Security + column grants decide what's allowed.

type Res<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const STATUS_KEYS = STATUSES.map(s => s.k);
const isDate = (d: unknown) => d === null || (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d));
const clean = (s: unknown, max = 4000) => String(s ?? '').trim().slice(0, max);

async function ctx() {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) throw new Error('Please log in again.');
  return { sb, uid: data.user.id };
}

async function leadRow(sb: Awaited<ReturnType<typeof supabaseServer>>, id: string) {
  const { data, error } = await sb.from('leads').select('id, company_id, status, attempts, first_called_at').eq('id', id).single();
  if (error || !data) throw new Error('Lead not found.');
  return data;
}

const fail = (e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : 'Not saved. Try again.' });

// Status dropdown / follow-up date picker.
export async function updateLead(id: string, up: { status?: string; follow_up?: string | null }): Promise<Res> {
  try {
    const { sb, uid } = await ctx();
    const patch: Record<string, unknown> = {};
    if (up.status !== undefined) { if (!STATUS_KEYS.includes(up.status)) throw new Error('Unknown status'); patch.status = up.status; }
    if (up.follow_up !== undefined) { if (!isDate(up.follow_up)) throw new Error('Bad date'); patch.follow_up = up.follow_up || null; }
    if (!Object.keys(patch).length) return { ok: true };
    const lead = await leadRow(sb, id);
    const { error } = await sb.from('leads').update(patch).eq('id', id);
    if (error) throw new Error(error.message);
    if (patch.status && patch.status !== lead.status) {
      await sb.from('lead_activity').insert({ lead_id: id, company_id: lead.company_id, user_id: uid, kind: 'status', status: patch.status as string });
      after(() => writeLeadStatus(id));   // copy to the sheet if the company turned that on
    }
    return { ok: true };
  } catch (e) { return fail(e); }
}

// "How did the call go?" sheet.
export async function logCall(id: string, input: { status: string; follow_up: string | null; note: string }): Promise<Res<{ attempts: number; first_called_at: string; last_called_at: string }>> {
  try {
    const { sb, uid } = await ctx();
    if (!STATUS_KEYS.includes(input.status) || input.status === 'New') throw new Error('Pick how the call went');
    if (!isDate(input.follow_up)) throw new Error('Bad date');
    const lead = await leadRow(sb, id);
    const now = new Date().toISOString();
    const patch = {
      status: input.status, follow_up: input.follow_up || null, attempts: (lead.attempts || 0) + 1,
      last_called_at: now, last_called_by: uid, first_called_at: lead.first_called_at || now,
    };
    const { error } = await sb.from('leads').update(patch).eq('id', id);
    if (error) throw new Error(error.message);
    await sb.from('lead_activity').insert({ lead_id: id, company_id: lead.company_id, user_id: uid, kind: 'call', status: input.status, body: clean(input.note) });
    if (input.status !== lead.status) after(() => writeLeadStatus(id));
    return { ok: true, attempts: patch.attempts, first_called_at: patch.first_called_at, last_called_at: now };
  } catch (e) { return fail(e); }
}

export async function addNote(id: string, body: string): Promise<Res> {
  try {
    const { sb, uid } = await ctx();
    const text = clean(body);
    if (!text) throw new Error('Type a note first');
    const lead = await leadRow(sb, id);
    const { error } = await sb.from('lead_activity').insert({ lead_id: id, company_id: lead.company_id, user_id: uid, kind: 'note', body: text });
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (e) { return fail(e); }
}

// WhatsApp taps count as contact attempts in the history (not as calls).
export async function logWhatsApp(id: string): Promise<Res> {
  try {
    const { sb, uid } = await ctx();
    const lead = await leadRow(sb, id);
    await sb.from('lead_activity').insert({ lead_id: id, company_id: lead.company_id, user_id: uid, kind: 'whatsapp' });
    return { ok: true };
  } catch (e) { return fail(e); }
}

// Settings (owner only; RLS enforces it too).
export async function updateCompany(input: { name: string; whatsapp_template: string; country_code: string }): Promise<Res> {
  try {
    const c = await activeCompany();
    if (!c || c.role !== 'owner') throw new Error('Only the owner can change company settings.');
    const name = clean(input.name, 120), tpl = clean(input.whatsapp_template, 1000), cc = clean(input.country_code, 4).replace(/\D/g, '');
    if (!name) throw new Error('Company name is required.');
    if (!tpl) throw new Error('WhatsApp message is required.');
    if (!cc) throw new Error('Country code is required, e.g. 91.');
    const { sb } = await ctx();
    const { error } = await sb.from('companies').update({ name, whatsapp_template: tpl, country_code: cc }).eq('id', c.id);
    if (error) throw new Error(error.message);
    revalidatePath('/app', 'layout');
    return { ok: true };
  } catch (e) { return fail(e); }
}
