import { notFound } from 'next/navigation';
import { activeCompany } from '@/lib/company';
import { supabaseServer } from '@/lib/supabase/server';
import { loadCtx } from '@/lib/loadLeads';
import { LEAD_COLS, type Activity, type Lead } from '@/lib/types';
import LeadDetail from './LeadDetail';

export const metadata = { title: 'Lead details · Lead Desk' };
export const dynamic = 'force-dynamic';

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const company = (await activeCompany())!;
  const sb = await supabaseServer();
  const [{ data: lead }, { data: acts }, { ctx }] = await Promise.all([
    sb.from('leads').select(LEAD_COLS).eq('id', id).eq('company_id', company.id).maybeSingle(),
    sb.from('lead_activity').select('id, kind, status, body, created_at, user_id').eq('lead_id', id).order('created_at', { ascending: false }).limit(100),
    loadCtx(company),
  ]);
  if (!lead) notFound();
  const ids = [...new Set((acts ?? []).map(a => a.user_id))];
  const { data: people } = ids.length ? await sb.from('profiles').select('id, full_name, email').in('id', ids) : { data: [] };
  const names = Object.fromEntries((people ?? []).map(p => [p.id, p.full_name || p.email]));
  return <LeadDetail lead={lead as Lead} ctx={ctx} activity={(acts ?? []) as Activity[]} names={names} />;
}
