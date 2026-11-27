'use server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { activeCompany, myCompanies, COMPANY_COOKIE } from '@/lib/company';
import { supabaseServer } from '@/lib/supabase/server';
import { siteUrl } from '@/lib/site';

type Res<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const fail = (e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : 'Something went wrong.' });

async function owner() {
  const c = await activeCompany();
  if (!c || c.role !== 'owner') throw new Error('Only the owner can manage the team.');
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) throw new Error('Please log in again.');
  return { c, sb, uid: data.user.id };
}

// Creates an invite and returns its link. The owner shares the link (WhatsApp / email / copy).
export async function createInvite(emailRaw: string, role: 'caller' | 'owner'): Promise<Res<{ url: string }>> {
  try {
    const { c, sb, uid } = await owner();
    const email = emailRaw.trim().toLowerCase();
    if (!EMAIL.test(email)) throw new Error('Enter a valid email address.');
    if (role !== 'caller' && role !== 'owner') throw new Error('Pick a role.');
    // Already a member?
    const { data: ms } = await sb.from('memberships').select('user_id').eq('company_id', c.id);
    const ids = (ms ?? []).map(m => m.user_id);
    if (ids.length) {
      const { data: ps } = await sb.from('profiles').select('email').in('id', ids);
      if ((ps ?? []).some(p => p.email?.toLowerCase() === email)) throw new Error('That person is already on your team.');
    }
    // One pending invite per email: replace an older one.
    await sb.from('invites').delete().eq('company_id', c.id).eq('email', email).is('accepted_at', null);
    const { data, error } = await sb.from('invites').insert({ company_id: c.id, email, role, invited_by: uid }).select('token').single();
    if (error || !data) throw new Error(error?.message || 'Could not create the invite.');
    revalidatePath('/app/settings');
    return { ok: true, url: `${siteUrl()}/invite/${data.token}` };
  } catch (e) { return fail(e); }
}

export async function cancelInvite(id: string): Promise<Res> {
  try {
    const { c, sb } = await owner();
    const { error } = await sb.from('invites').delete().eq('id', id).eq('company_id', c.id);
    if (error) throw new Error(error.message);
    revalidatePath('/app/settings');
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function removeMember(userId: string): Promise<Res> {
  try {
    const { c, sb, uid } = await owner();
    if (userId === uid) throw new Error('You can’t remove yourself.');
    const { error, count } = await sb.from('memberships').delete({ count: 'exact' }).eq('company_id', c.id).eq('user_id', userId);
    if (error) throw new Error(error.message);
    if (!count) throw new Error('Could not remove this person.');
    revalidatePath('/app/settings');
    return { ok: true };
  } catch (e) { return fail(e); }
}

// For people in more than one company.
export async function switchCompany(id: string) {
  const list = await myCompanies();
  if (!list.some(c => c.id === id)) return;
  (await cookies()).set(COMPANY_COOKIE, id, { path: '/', sameSite: 'lax', httpOnly: true, secure: true, maxAge: 60 * 60 * 24 * 365 });
  redirect('/app');
}
