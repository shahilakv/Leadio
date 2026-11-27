'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import SheetPicker, { useSheetFilter } from './SheetPicker';
import { useRouter } from 'next/navigation';
import { STATUSES, NOTCONN, WARM, ymd } from '@/lib/leads';
import type { Ctx, Lead } from '@/lib/types';
import LeadCard, { waParts } from './LeadCard';
import AfterCall from './AfterCall';
import { useLeads } from './useLeads';

const SYNC_MS = 60_000;
type Order = 'newest' | 'oldest';

const isToday = (l: Lead) => !!l.lead_time && ymd(new Date(l.lead_time)) === ymd(new Date());
const TILES = [
  { k: 'today', t: 'Today’s leads', f: isToday, sub: (n: number) => `${n} lead${n === 1 ? '' : 's'}` },
  { k: 'notconn', t: 'Not connected', f: (l: Lead) => NOTCONN.includes(l.status), sub: (n: number) => `${n} · new or no answer` },
  { k: 'warm', t: 'Interested', f: (l: Lead) => WARM.includes(l.status), sub: (n: number) => `${n} · interested or visit booked` },
];
// "Call list" = leads nobody has updated yet (status New). Logging a call always sets another status,
// so a called lead leaves this list. It's the default view.
const CHIPS = [
  { k: 'calllist', t: 'Call list', f: (l: Lead) => l.status === 'New', sub: (n: number) => `${n} to call` },
  { k: 'all', t: 'All leads', f: () => true, sub: (n: number) => `${n} leads` },
  ...STATUSES.filter(s => !['New', 'No answer', 'Interested'].includes(s.k)).map(s => ({ k: s.k, t: s.k, c: s.c, f: (l: Lead) => l.status === s.k, sub: (n: number) => `${n} lead${n === 1 ? '' : 's'}` })),
];
const VIEW = (k: string) => TILES.find(x => x.k === k) || CHIPS.find(x => x.k === k) || CHIPS[0];

export default function LeadsView({ initial, ctx, syncError, truncated, company }: { initial: Lead[]; ctx: Ctx; syncError: string; truncated: boolean; company: string }) {
  const router = useRouter();
  const L = useLeads(initial);
  const sources = useMemo(() => Object.values(ctx.sources), [ctx.sources]);
  const [sheet, setSheet] = useSheetFilter(sources);
  const counts = useMemo(() => L.leads.reduce<Record<string, number>>((m, l) => { m[l.source_id] = (m[l.source_id] || 0) + 1; return m; }, {}), [L.leads]);
  const leads = sheet ? L.leads.filter(l => l.source_id === sheet) : L.leads;
  const [filter, setFilter] = useState('calllist');
  const [q, setQ] = useState('');
  // Newest first / Oldest first, remembered on this device.
  const [order, setOrderState] = useState<Order>('newest');
  useEffect(() => { try { if (localStorage.getItem('ld_order') === 'oldest') setOrderState('oldest'); } catch { /* private mode */ } }, []);
  const setOrder = (o: Order) => { setOrderState(o); try { localStorage.setItem('ld_order', o); } catch { /* private mode */ } };
  const [syncErr, setSyncErr] = useState(syncError);
  const busy = useRef(false);

  // Pull new rows from the sheet when the screen opens and every minute while it's visible.
  useEffect(() => {
    const sync = async () => {
      if (busy.current || document.visibilityState !== 'visible') return;
      busy.current = true;
      try {
        const r = await fetch('/api/sync', { method: 'POST' });
        if (r.ok) {
          const j = await r.json() as { added: number; errors: string[] };
          setSyncErr(j.errors[0] || '');
          if (j.added > 0) { L.say(`${j.added} new lead${j.added === 1 ? '' : 's'}`); router.refresh(); }
        }
      } catch { /* offline: try again next minute */ }
      busy.current = false;
    };
    sync();
    const t = setInterval(sync, SYNC_MS);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const v = VIEW(filter);
  const inView = leads.filter(v.f);
  const query = q.trim().toLowerCase();
  const matched = query
    ? leads.filter(l => [l.name, l.phone, l.campaign, ...Object.values(l.fields || {})].join(' ').toLowerCase().includes(query))
    : inView;
  // Leads arrive newest first; "Oldest first" just reverses the list.
  const shown = order === 'oldest' ? [...matched].reverse() : matched;
  const sheetLead = L.sheet ? L.leads.find(l => l.id === L.sheet!.id) || null : null;

  return (
    <>
      <div className="hd">
        <div className="grow"><div className="lbl">Company</div><div className="h1">{company}</div></div>
        <SheetPicker sources={sources} value={sheet} onChange={setSheet} counts={counts} />
      </div>
      {syncErr && <p className="note" role="status">Couldn’t fetch new leads: {syncErr}</p>}
      <div className="tiles">
        {TILES.map(t => (
          <button key={t.k} className={'tile' + (filter === t.k ? ' on' : '')} onClick={() => { setFilter(t.k); setQ(''); }}>
            <b>{leads.filter(t.f).length}</b><span>{t.t}</span>
          </button>
        ))}
      </div>
      <label className="search">
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, phone, city" autoComplete="off" aria-label="Search leads" />
      </label>
      <div className="chips">
        {CHIPS.map(c => (
          <button key={c.k} className={'chip' + (filter === c.k ? ' on' : '')} onClick={() => { setFilter(c.k); setQ(''); }}>
            {'c' in c && <i style={{ ['--c' as string]: c.c }} />}{c.t} <em>{leads.filter(c.f).length}</em>
          </button>
        ))}
      </div>
      <div className="ltitle">
        <div><h2>{query ? 'Search results' : v.t}</h2><p>{query ? `${shown.length} found in all leads` : v.sub(inView.length)}</p></div>
        <label className="sortpick">
          <select value={order} onChange={e => setOrder(e.target.value as Order)} aria-label="Sort leads">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </div>
      <div className="list">
        {shown.length ? shown.slice(0, 300).map(l => (
          <LeadCard key={l.id} lead={l} ctx={ctx} onCall={L.markCall} onWa={L.tapWhatsApp} onStatus={L.setStatus} />
        )) : (
          <div className="empty">
            <b>{query ? 'No match' : filter === 'calllist' ? 'Call list done 🎉' : filter === 'today' ? 'No new leads today yet' : filter === 'notconn' ? 'Everyone has been reached 🎉' : 'Nothing here'}</b>
            <p className="sub">{query ? 'Try a name, number or city.' : filter === 'calllist' ? 'Every lead has been called. New leads from your sheet show up here.' : filter === 'today' ? 'Check “Not connected” for people still waiting for a call.' : 'No leads in this list right now.'}</p>
          </div>
        )}
        {shown.length > 300 && <p className="note">Showing the first 300. Use search or the filters to find others.</p>}
        {truncated && <p className="note">Only your newest 3,000 leads are loaded.</p>}
      </div>
      <AfterCall lead={sheetLead} secs={L.sheet?.secs || 0} countryCode={ctx.countryCode} wa={sheetLead ? waParts(sheetLead, ctx) : null} onWa={L.tapWhatsApp} onSave={L.saveCall} onClose={() => L.setSheet(null)} say={L.say} />
      <div className={'toast' + (L.toast ? ' on' : '')} role="status">{L.toast}</div>
    </>
  );
}
