'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { checkSheet, inspectTab, connectSheet } from './actions';
import { label, ROLES, type FieldMap, type Role } from '@/lib/leads';

const ROLE_LABEL: Record<Role, string> = {
  name: 'Name', phone: 'Phone number', time: 'Date the lead came in', campaign: 'Campaign', city: 'City / location', type: 'What they’re looking for',
};
const REQUIRED: Role[] = ['name', 'phone'];

type Sheet = { id: string; title: string; tabs: string[]; tab: string };
type Inspect = { headers: string[]; samples: Record<string, string>; rows: number };

export default function ConnectSheet({ robot, company }: { robot: string | null; company: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState('');
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [cols, setCols] = useState<Inspect | null>(null);
  const [map, setMap] = useState<FieldMap>({});
  const [card, setCard] = useState<string[]>([]);
  const [done, setDone] = useState('');

  const copy = async () => { if (!robot) return; try { await navigator.clipboard.writeText(robot); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* user can select the text */ } };

  const check = () => start(async () => {
    setErr('');
    const r = await checkSheet(url);
    if ('error' in r) return setErr(r.error);
    setSheet(r);
    if (r.tabs.length === 1) openMap(r, r.tab);
  });

  const openMap = (s: Sheet, tab: string) => start(async () => {
    setErr('');
    const r = await inspectTab(s.id, tab);
    if ('error' in r) return setErr(r.error);
    setSheet({ ...s, tab });
    setCols(r);
    setMap(r.guess);
    // Start with the useful extras ticked: city, type, campaign (if found).
    setCard([r.guess.city, r.guess.type].filter((h): h is string => !!h));
  });

  const connect = () => start(async () => {
    if (!sheet) return;
    setErr('');
    const r = await connectSheet({ id: sheet.id, tab: sheet.tab, title: sheet.title, map, cardFields: card });
    if ('error' in r) return setErr(r.error);
    setDone(`${r.total} lead${r.total === 1 ? '' : 's'} fetched`);
    router.push('/app');
    router.refresh();
  });

  const toggle = (h: string) => setCard(c => (c.includes(h) ? c.filter(x => x !== h) : c.length >= 8 ? c : [...c, h]));
  const extras = cols ? cols.headers.filter(h => h !== map.name && h !== map.phone && !/^(id|lead_?id)$/i.test(h)) : [];

  return (
    <>
      <div className="card">
        <p className="lbl">Step 2 of 3 · {company}</p>
        <h1>Connect your Google Sheet</h1>
        <p className="sub">Use the sheet your Meta lead ads fill. Lead Desk only reads it; nothing in your sheet is changed.</p>

        <ol className="steps">
          <li>
            <b>Share the sheet with Lead Desk.</b> Open it, tap <b>Share</b>, and add this email as <b>Viewer</b>:
            {robot
              ? <span className="robot"><code>{robot}</code><button type="button" className="pill" onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button></span>
              : <span className="err">Sheet connections aren’t set up on the server yet (GOOGLE_SERVICE_ACCOUNT_JSON).</span>}
          </li>
          <li><b>Paste the sheet’s link here.</b> Copy it from your browser’s address bar.</li>
        </ol>

        <label className="field">
          <span className="lbl">Google Sheet link</span>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…" inputMode="url" autoComplete="off" />
        </label>
        {err && !cols && <p className="err" role="alert">{err}</p>}
        <button className="btn" onClick={check} disabled={pending || !url.trim() || !robot}>{pending && !sheet ? 'Checking…' : 'Check sheet'}</button>

        {sheet && sheet.tabs.length > 1 && (
          <div>
            <span className="lbl">“{sheet.title}” has {sheet.tabs.length} tabs. Which one has the leads?</span>
            <div className="chips wrap">
              {sheet.tabs.map(t => (
                <button key={t} type="button" className={'chip' + (t === sheet.tab ? ' on' : '')} onClick={() => openMap(sheet, t)} disabled={pending}>{t}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Field picker pop-up */}
      <div className={'ov' + (cols ? ' on' : '')} onClick={() => !pending && setCols(null)} />
      <div className={'sheet' + (cols ? ' on' : '')} role="dialog" aria-modal="true" aria-label="Choose your fields">
        <div className="grab" />
        {cols && sheet && (
          <>
            <div>
              <h2>Choose your fields</h2>
              <p className="sub">“{sheet.tab}” · {cols.rows >= 29 ? '29+' : cols.rows} leads found. We guessed the columns. Check them, and pick what to show on each lead card.</p>
            </div>

            {ROLES.map(r => (
              <label key={r} className="field">
                <span className="lbl">{ROLE_LABEL[r]}{REQUIRED.includes(r) ? ' *' : ' (optional)'}</span>
                <select value={map[r] || ''} onChange={e => setMap(m => ({ ...m, [r]: e.target.value || undefined }))}>
                  <option value="">{REQUIRED.includes(r) ? 'Choose a column' : 'Not in my sheet'}</option>
                  {cols.headers.map(h => <option key={h} value={h}>{label(h)}{cols.samples[h] ? ` — e.g. ${cols.samples[h].slice(0, 30)}` : ''}</option>)}
                </select>
              </label>
            ))}

            <div>
              <span className="lbl">Show on the lead card (up to 8)</span>
              <div className="ticks">
                {extras.map(h => (
                  <label key={h} className={'tick' + (card.includes(h) ? ' on' : '')}>
                    <input type="checkbox" checked={card.includes(h)} onChange={() => toggle(h)} />
                    <span><b>{label(h)}</b>{cols.samples[h] && <small>{cols.samples[h].slice(0, 60)}</small>}</span>
                  </label>
                ))}
              </div>
            </div>

            {err && <p className="err" role="alert">{err}</p>}
            {done && <p className="ok" role="status">{done}. Opening your leads…</p>}
            <button className="btn" onClick={connect} disabled={pending || !map.name || !map.phone}>
              {pending ? 'Fetching your leads…' : 'Connect and fetch leads'}
            </button>
            <button className="btn light" onClick={() => setCols(null)} disabled={pending}>Back</button>
          </>
        )}
      </div>
    </>
  );
}
