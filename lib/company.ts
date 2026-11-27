import 'server-only';
import { cookies } from 'next/headers';
import { supabaseServer } from '@/lib/supabase/server';

export type Company = { id: string; name: string; role: 'owner' | 'caller'; whatsapp_template: string; country_code: string };

export const COMPANY_COOKIE = 'ld_company';

// Companies the signed-in user belongs to (RLS returns only their own memberships' companies).
export async function myCompanies(): Promise<Company[]> {
  const sb = await supabaseServer();
  const { data: user } = await sb.auth.getUser();
  if (!user.user) return [];
  const { data, error } = await sb
    .from('memberships')
    .select('role, companies(id, name, whatsapp_template, country_code)')
    .eq('user_id', user.user.id)
    .order('created_at');
  if (error) throw error;
  return (data ?? []).flatMap(m => {
    const c = m.companies as unknown as Omit<Company, 'role'> | null;
    return c ? [{ ...c, role: m.role as Company['role'] }] : [];
  });
}

// The company the user is working in: the one remembered in a cookie, else their first.
export async function activeCompany(): Promise<Company | null> {
  const list = await myCompanies();
  const want = (await cookies()).get(COMPANY_COOKIE)?.value;
  return list.find(c => c.id === want) ?? list[0] ?? null;
}
