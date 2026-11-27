'use server';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { safeNext, siteUrl } from '@/lib/site';

export type FormState = { error?: string; ok?: string } | undefined;

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signUp(_: FormState, f: FormData): Promise<FormState> {
  const name = str(f, 'name'), email = str(f, 'email').toLowerCase(), password = String(f.get('password') ?? '');
  const next = safeNext(f.get('next'), '/onboarding');
  if (!name) return { error: 'Please enter your name.' };
  if (!EMAIL.test(email)) return { error: 'Please enter a valid email address.' };
  if (password.length < 8) return { error: 'Use a password with at least 8 characters.' };
  const sb = await supabaseServer();
  const { error } = await sb.auth.signUp({
    email, password,
    options: { data: { full_name: name }, emailRedirectTo: `${siteUrl()}/auth/confirm?next=${encodeURIComponent(next)}` },
  });
  if (error) return { error: error.message };
  redirect(`/verify?email=${encodeURIComponent(email)}`);
}

export async function logIn(_: FormState, f: FormData): Promise<FormState> {
  const email = str(f, 'email').toLowerCase(), password = String(f.get('password') ?? '');
  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    if (/confirm/i.test(error.message)) return { error: 'Please verify your email first. We sent you a link when you signed up.' };
    return { error: 'Wrong email or password.' };
  }
  redirect(safeNext(f.get('next')));
}

export async function resendVerification(_: FormState, f: FormData): Promise<FormState> {
  const email = str(f, 'email').toLowerCase();
  if (!EMAIL.test(email)) return { error: 'Missing email address.' };
  const sb = await supabaseServer();
  const { error } = await sb.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${siteUrl()}/auth/confirm?next=/onboarding` } });
  return error ? { error: error.message } : { ok: 'Sent again. Check your inbox and spam folder.' };
}

export async function requestReset(_: FormState, f: FormData): Promise<FormState> {
  const email = str(f, 'email').toLowerCase();
  if (!EMAIL.test(email)) return { error: 'Please enter a valid email address.' };
  const sb = await supabaseServer();
  await sb.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl()}/auth/confirm?next=/update-password` });
  // Same answer whether or not the account exists, so emails can't be probed.
  return { ok: 'If that email has an account, a reset link is on its way.' };
}

export async function updatePassword(_: FormState, f: FormData): Promise<FormState> {
  const password = String(f.get('password') ?? '');
  if (password.length < 8) return { error: 'Use a password with at least 8 characters.' };
  const sb = await supabaseServer();
  const { error } = await sb.auth.updateUser({ password });
  if (error) return { error: error.message };
  redirect('/app');
}

export async function signOut() {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  redirect('/login');
}
