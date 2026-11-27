import { activeCompany } from '@/lib/company';
import { supabaseServer } from '@/lib/supabase/server';
import { loadCtx } from '@/lib/loadLeads';
import { CLOSED } from '@/lib/leads';
import { LEAD_COLS, type Lead } from '@/lib/types';
import FollowUpsView from './FollowUpsView';

export const metadata = { title: 'Follow-ups · Lead Desk' };
export const dynamic = 'force-dynamic';

export default async function FollowUps() {
  const company = (await activeCompany())!;
  const sb = await supabaseServer();
  const [{ data }, { ctx }] = await Promise.all([
    sb.from('leads').select(LEAD_COLS).eq('company_id', company.id).not('follow_up', 'is', null)
      .not('status', 'in', `(${CLOSED.map(s => `"${s}"`).join(',')})`).order('follow_up').limit(2000),
    loadCtx(company),
  ]);
  return (
    <>
      <div className="hd"><div className="grow h1">Follow-ups</div></div>
      <FollowUpsView initial={(data ?? []) as Lead[]} ctx={ctx} />
    </>
  );
}
