'use client';
import { CLOSED, FOLLOW_GROUPS, followGroup } from '@/lib/leads';
import type { Ctx, Lead } from '@/lib/types';
import LeadCard from '../LeadCard';
import AfterCall from '../AfterCall';
import { useLeads } from '../useLeads';

export default function FollowUpsView({ initial, ctx }: { initial: Lead[]; ctx: Ctx }) {
  const L = useLeads(initial);
  const open = L.leads.filter(l => l.follow_up && !CLOSED.includes(l.status));
  const groups = FOLLOW_GROUPS.map(g => ({ g, ls: open.filter(l => followGroup(l.follow_up!) === g) })).filter(x => x.ls.length);
  const sheetLead = L.sheet ? L.leads.find(l => l.id === L.sheet!.id) || null : null;

  return (
    <>
      {groups.length ? groups.map(({ g, ls }) => (
        <section key={g}>
          <h2 className="group" style={g === 'Overdue' ? { color: '#C2410C' } : undefined}>{g} · {ls.length}</h2>
          <div className="list">
            {ls.map(l => <LeadCard key={l.id} lead={l} ctx={ctx} onCall={L.markCall} onWa={L.tapWhatsApp} onStatus={L.setStatus} />)}
          </div>
        </section>
      )) : (
        <div className="empty"><b>No follow-ups</b><p className="sub">When you set a follow-up date after a call, the lead shows up here on that day.</p></div>
      )}
      <AfterCall lead={sheetLead} secs={L.sheet?.secs || 0} countryCode={ctx.countryCode} onSave={L.saveCall} onClose={() => L.setSheet(null)} say={L.say} />
      <div className={'toast' + (L.toast ? ' on' : '')} role="status">{L.toast}</div>
    </>
  );
}
