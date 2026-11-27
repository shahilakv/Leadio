'use client';
import { useMemo } from 'react';
import SheetPicker, { useSheetFilter } from '../SheetPicker';
import { CLOSED, FOLLOW_GROUPS, followGroup } from '@/lib/leads';
import type { Ctx, Lead } from '@/lib/types';
import LeadCard from '../LeadCard';
import AfterCall from '../AfterCall';
import { useLeads } from '../useLeads';

export default function FollowUpsView({ initial, ctx }: { initial: Lead[]; ctx: Ctx }) {
  const L = useLeads(initial);
  const sources = useMemo(() => Object.values(ctx.sources), [ctx.sources]);
  const [sheet, setSheet] = useSheetFilter(sources);
  const all = L.leads.filter(l => l.follow_up && !CLOSED.includes(l.status));
  const counts = all.reduce<Record<string, number>>((m, l) => { m[l.source_id] = (m[l.source_id] || 0) + 1; return m; }, {});
  const open = sheet ? all.filter(l => l.source_id === sheet) : all;
  const groups = FOLLOW_GROUPS.map(g => ({ g, ls: open.filter(l => followGroup(l.follow_up!) === g) })).filter(x => x.ls.length);
  const sheetLead = L.sheet ? L.leads.find(l => l.id === L.sheet!.id) || null : null;

  return (
    <>
      <div className="hd">
        <div className="grow h1">Follow-ups</div>
        <SheetPicker sources={sources} value={sheet} onChange={setSheet} counts={counts} />
      </div>
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
