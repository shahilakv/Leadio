import { activeCompany } from '@/lib/company';
import { supabaseServer } from '@/lib/supabase/server';
import { loadCtx } from '@/lib/loadLeads';
import { FOLLOW_STATUSES } from '@/lib/leads';
import { LEAD_COLS, type Lead } from '@/lib/types';
import FollowUpsView from './FollowUpsView';

export const metadata = { title: 'Follow-ups · Leadio' };
export const dynamic = 'force-dynamic';

export default async function FollowUps() {
  const company = (await activeCompany())!;
  const sb = await supabaseServer();
  const [{ data }, { ctx }] = await Promise.all([
    // Leads to call again: "No answer" and "Follow-up", soonest follow-up first, undated ones last.
    sb.from('leads').select(LEAD_COLS).eq('company_id', company.id).in('status', FOLLOW_STATUSES)
      .order('follow_up', { ascending: true, nullsFirst: false }).order('lead_time', { ascending: false }).limit(3000),
    loadCtx(company),
  ]);
  return <FollowUpsView initial={(data ?? []) as Lead[]} ctx={ctx} />;
}
