'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  STATUSES, NOTCONN, WARM, ymd, ago, fmtWhen, fmtPhone, cleanPhone, waText, waLink, label, nice, statusOf, initials,
  type FieldMap,
} from '@/lib/leads';

export type Lead = {
  id: string; source_id: string; name: string; phone: string; lead_time: string | null; campaign: string;
  fields: Record<string, string>; status: string; follow_up: string | null; attempts: number; last_called_at: string | null;
};
export type Source = { id: string; label: string; tab_title: string; field_map: FieldMap; card_fields: string[]; last_synced_at: string | null; last_error: string | null };

const AVS = ['#E4E0FA', '#F8DCE5', '#F3F4F6', '#DCF4EA'];
const SYNC_MS = 60_000;

const isToday = (l: Lead) => !!l.lead_time && ymd(new Date(l.lead_time)) === ymd(new Date());
const TILES = [
  { k: 'today', t: 'Today’s leads', f: isToday, sub: (n: number) => `${n} lead${n === 1 ? '' : 's'} · newest first` },
  { k: 'notconn', t: 'Not connected', f: (l: Lead) => NOTCONN.includes(l.status), sub: (n: number) => `${n} · new or no answer` },
  { k: 'warm', t: 'Interested', f: (l: Lead) => WARM.includes(l.status), sub: (n: number) => `${n} · interested or visit booked` },
];
const CHIPS = [
  { k: 'all', t: 'All leads', f: () => true, sub: (n: number) => `${n} leads · newest first` },
  ...STATUSES.filter(s => !['New', 'No answer', 'Interested'].includes(s.k)).map(s => ({ k: s.k, t: s.k, c: s.c, f: (l: Lead) => l.status === s.k, sub: (n: number) => `${n} lead${n === 1 ? '' : 's'}` })),
];
const VIEW = (k: string) => TILES.find(x => x.k === k) || CHIPS.find(x => x.k === k) || CHIPS[0];

export default function LeadsView({ leads, sources, template, countryCode, truncated }: {
  leads: Lead[]; sources: Source[]; template: string; countryCode: string; truncated: boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState(() => (leads.some(isToday) ? 'today' : leads.some(TILES[1].f) ? 'notconn' : 'all'));
  const [q, setQ] = useState('');
  const [toast, setToast] = useState('');
  const [syncErr, setSyncErr] = useState(sources.find(s => s.last_error)?.last_error || '');
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
          if (j.added > 0) {
            setToast(`${j.added} new lead${j.added === 1 ? '' : 's'}`); setTimeout(() => setToast(''), 2500);
            router.refresh();
          }
        }
      } catch { /* offline: try again next minute */ }
      busy.current = false;
    };
    sync();
    const t = setInterval(sync, SYNC_MS);
    const onVis = () => { if (document.visibilityState === 'visible') sync(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, [router]);

  const cardFields = useMemo(() => Object.fromEntries(sources.map(s => [s.id, s]) ), [sources]);
  const v = VIEW(filter);
  const inView = leads.filter(v.f);
  const query = q.trim().toLowerCase();
  const shown = query
    ? leads.filter(l => [l.name, l.phone, l.campaign, ...Object.values(l.fields || {})].join(' ').toLowerCase().includes(query))
    : inView;
  const next = shown.find(l => NOTCONN.includes(l.status) && cleanPhone(l.phone, countryCode));

  return (
    <>
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
        {next && <a className="next" href={'tel:+' + cleanPhone(next.phone, countryCode)} aria-label={'Call next: ' + next.name}>☎ Call next</a>}
      </div>
      <div className="list">
        {shown.length ? shown.slice(0, 300).map((l, i) => (
          <LeadCard key={l.id} lead={l} source={cardFields[l.source_id]} template={template} countryCode={countryCode} bg={AVS[i % AVS.length]} />
        )) : (
          <div className="empty">
            <b>{query ? 'No match' : filter === 'today' ? 'No new leads today yet' : 'Nothing here'}</b>
            <p className="sub">{query ? 'Try a name, number or city.' : filter === 'today' ? 'Check “Not connected” for people still waiting for a call.' : 'No leads in this list right now.'}</p>
          </div>
        )}
        {shown.length > 300 && <p className="note">Showing the first 300. Use search or the filters to find others.</p>}
        {truncated && <p className="note">Only your newest 3,000 leads are loaded.</p>}
      </div>
      <div className={'toast' + (toast ? ' on' : '')} role="status">{toast}</div>
    </>
  );
}

function LeadCard({ lead: l, source, template, countryCode, bg }: { lead: Lead; source?: Source; template: string; countryCode: string; bg: string }) {
  const ph = cleanPhone(l.phone, countryCode);
  const s = statusOf(l.status);
  const map = source?.field_map || {};
  const extra = (source?.card_fields || []).filter(h => h !== map.name && h !== map.phone && l.fields?.[h]);
  const wa = waText(template, { name: l.name, type: map.type ? l.fields?.[map.type] : '', city: map.city ? l.fields?.[map.city] : '' });
  const when = l.lead_time ? `${fmtWhen(l.lead_time)} · ${ago(l.lead_time)}` : '';
  return (
    <article className="lc">
      <div className="ctop">
        <div className="av" style={{ background: bg }}>{initials(l.name || '?')}</div>
        <div style={{ flex: 1 }}>
          <div className="nm">{l.name || 'No name'}</div>
          {when && <span className="dt">{when}</span>}
        </div>
        <span className="badge" style={{ ['--c' as string]: s.c, ['--t' as string]: s.t }}>{s.k}</span>
      </div>
      <div className="ph">{ph ? fmtPhone(ph) : l.phone || 'No phone number'}</div>
      {extra.length > 0 && (
        <div className="info">
          {extra.map(h => <span key={h}><small>{label(h)}</small>{nice(l.fields[h])}</span>)}
        </div>
      )}
      <div className="acts">
        {ph ? (
          <>
            <a className="act call" href={'tel:+' + ph}>☎ Call</a>
            <a className="act wa" href={waLink(ph, wa)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          </>
        ) : <div className="nophone">No valid phone number</div>}
      </div>
    </article>
  );
}
