'use client';
import { useMemo, useState } from 'react';
import SheetPicker, { useSheetFilter } from '../SheetPicker';
import { FOLLOW_GROUPS, FOLLOW_STATUSES, followGroup, statusOf } from '@/lib/leads';
import type { Ctx, Lead } from '@/lib/types';
import LeadCard, { waParts } from '../LeadCard';
import AfterCall from '../AfterCall';
import { useLeads } from '../useLeads';

// Follow-ups = leads to call again: "No answer" and "Follow-up". Grouped by follow-up date,
// with a filter between the two statuses. A lead leaves this tab as soon as it gets another status.
export default function FollowUpsView({ initial, ctx }: { initial: Lead[]; ctx: Ctx }) {
  const L = useLeads(initial);
  const sources = useMemo(() => Object.values(ctx.sources), [ctx.sources]);
  const [sheet, setSheet] = useSheetFilter(sources);
  const [which, setWhich] = useState<string>('all');

  const mine = L.leads.filter(l => FOLLOW_STATUSES.includes(l.status) && (!sheet || l.source_id === sheet));
  const counts = L.leads.filter(l => FOLLOW_STATUSES.includes(l.status))
    .reduce<Record<string, number>>((m, l) => { m[l.source_id] = (m[l.source_id] || 0) + 1; return m; }, {});
  const shown = which === 'all' ? mine : mine.filter(l => l.status === which);
  const groups = FOLLOW_GROUPS.map(g => ({ g, ls: shown.filter(l => followGroup(l.follow_up) === g) })).filter(x => x.ls.length);
  const sheetLead = L.sheet ? L.leads.find(l => l.id === L.sheet!.id) || null : null;

  return (
    <>
      <div className="hd">
        <div className="grow h1">Follow-ups</div>
        <SheetPicker sources={sources} value={sheet} onChange={setSheet} counts={counts} />
      </div>
      <div className="chips" style={{ marginBottom: 12 }}>
        <button className={'chip' + (which === 'all' ? ' on' : '')} onClick={() => setWhich('all')}>All <em>{mine.length}</em></button>
        {FOLLOW_STATUSES.map(s => (
          <button key={s} className={'chip' + (which === s ? ' on' : '')} onClick={() => setWhich(s)}>
            <i style={{ ['--c' as string]: statusOf(s).c }} />{s} <em>{mine.filter(l => l.status === s).length}</em>
          </button>
        ))}
      </div>
      {groups.length ? groups.map(({ g, ls }) => (
        <section key={g}>
          <h2 className="group" style={g === 'Overdue' ? { color: '#C2410C' } : undefined}>{g} · {ls.length}</h2>
          <div className="list">
            {ls.map(l => <LeadCard key={l.id} lead={l} ctx={ctx} onCall={L.markCall} onWa={L.tapWhatsApp} onStatus={L.setStatus} />)}
          </div>
        </section>
      )) : (
        <div className="empty">
          <b>{which === 'all' ? 'No follow-ups' : `No “${which}” leads`}</b>
          <p className="sub">Leads you mark “No answer” or “Follow-up” after a call show up here, sorted by their follow-up date.</p>
        </div>
      )}
      <AfterCall lead={sheetLead} secs={L.sheet?.secs || 0} countryCode={ctx.countryCode} wa={sheetLead ? waParts(sheetLead, ctx) : null} onWa={L.tapWhatsApp} onSave={L.saveCall} onClose={() => L.setSheet(null)} say={L.say} />
      <div className={'toast' + (L.toast ? ' on' : '')} role="status">{L.toast}</div>
    </>
  );
}
