'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { COMPANY_COOKIE } from '@/lib/company';
import type { FormState } from '../(auth)/actions';

export async function createCompany(_: FormState, f: FormData): Promise<FormState> {
  const name = String(f.get('company') ?? '').trim();
  if (!name) return { error: 'Please enter your company name.' };
  if (name.length > 120) return { error: 'That name is too long.' };
  const sb = await supabaseServer();
  const { data, error } = await sb.rpc('create_company', { company_name: name });
  if (error) return { error: error.message };
  (await cookies()).set(COMPANY_COOKIE, String(data), { path: '/', sameSite: 'lax', httpOnly: true, secure: true, maxAge: 60 * 60 * 24 * 365 });
  redirect('/app');
}
