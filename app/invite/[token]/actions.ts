'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { COMPANY_COOKIE } from '@/lib/company';

// Joins the company through the accept_invite() database function (checks token, expiry and email).
export async function acceptInvite(token: string): Promise<{ error: string } | void> {
  const sb = await supabaseServer();
  const { data, error } = await sb.rpc('accept_invite', { invite_token: token });
  if (error || !data) return { error: error?.message || 'Could not join. Ask for a new invite link.' };
  (await cookies()).set(COMPANY_COOKIE, String(data), { path: '/', sameSite: 'lax', httpOnly: true, secure: true, maxAge: 60 * 60 * 24 * 365 });
  redirect('/app');
}
