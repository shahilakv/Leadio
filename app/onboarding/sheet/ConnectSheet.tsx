'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { checkSheet, inspectTab, connectSheet, pickerConfig, type Via } from './actions';
import { label, ROLES, type FieldMap, type Role } from '@/lib/leads';

const ROLE_LABEL: Record<Role, string> = {
  name: 'Name', phone: 'Phone number', time: 'Date the lead came in', campaign: 'Campaign', city: 'City / location', type: 'What they’re looking for',
};
const REQUIRED: Role[] = ['name', 'phone'];

type Sheet = { id: string; title: string; tabs: string[]; tab: string };
type Inspect = { headers: string[]; samples: Record<string, string>; rows: number };

/* ---------- Google Picker (loaded only when used) ---------- */
type PickerNS = {
  PickerBuilder: new () => PickerBuilder; DocsView: new (v: string) => { setMode(m: string): unknown };
  ViewId: { SPREADSHEETS: string }; DocsViewMode: { LIST: string }; Action: { PICKED: string; CANCEL: string };
};
type PickerBuilder = {
  addView(v: unknown): PickerBuilder; setOAuthToken(t: string): PickerBuilder; setDeveloperKey(k: string): PickerBuilder;
  setAppId(a: string): PickerBuilder; setTitle(t: string): PickerBuilder; setCallback(cb: (d: { action: string; docs?: { id: string }[] }) => void): PickerBuilder;
  build(): { setVisible(v: boolean): void };
};
type W = Window & { gapi?: { load(n: string, o: { callback: () => void }): void }; google?: { picker?: PickerNS } };

function loadPicker(): Promise<PickerNS> {
  const w = window as W;
  if (w.google?.picker) return Promise.resolve(w.google.picker);
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://apis.google.com/js/api.js'; s.async = true;
    s.onload = () => w.gapi!.load('picker', { callback: () => (w.google?.picker ? res(w.google.picker) : rej(new Error('Google Picker didn’t load'))) });
    s.onerror = () => rej(new Error('Couldn’t load Google Picker. Check your connection.'));
    document.head.appendChild(s);
  });
}

export default function ConnectSheet({ robot, company, googleEnabled, googleConnected, googleError }: {
  robot: string | null; company: string; googleEnabled: boolean; googleConnected: boolean; googleError: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [via, setVia] = useState<Via | null>(googleConnected ? 'google' : googleEnabled ? null : 'link');
  const [err, setErr] = useState(googleError);
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [cols, setCols] = useState<Inspect | null>(null);
  const [map, setMap] = useState<FieldMap>({});
  const [card, setCard] = useState<string[]>([]);
  const [done, setDone] = useState('');

  const copy = async () => { if (!robot) return; try { await navigator.clipboard.writeText(robot); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* user can select the text */ } };

  const openSheet = (idOrUrl: string, how: Via) => start(async () => {
    setErr('');
    const r = await checkSheet(idOrUrl, how);
    if ('error' in r) return setErr(r.error);
    setSheet(r);
    if (r.tabs.length === 1) await openMapNow(r, r.tab, how);
  });

  const openMapNow = async (s: Sheet, tab: string, how: Via) => {
    setErr('');
    const r = await inspectTab(s.id, tab, how);
    if ('error' in r) return setErr(r.error);
    setSheet({ ...s, tab });
    setCols(r);
    setMap(r.guess);
    setCard([r.guess.city, r.guess.type].filter((h): h is string => !!h));
  };
  const openMap = (s: Sheet, tab: string) => start(() => openMapNow(s, tab, via!));

  const pick = () => start(async () => {
    setErr('');
    const cfg = await pickerConfig();
    if ('error' in cfg) return setErr(cfg.error);
    try {
      const P = await loadPicker();
      const view = new P.DocsView(P.ViewId.SPREADSHEETS); view.setMode(P.DocsViewMode.LIST);
      new P.PickerBuilder().addView(view).setOAuthToken(cfg.token).setDeveloperKey(cfg.apiKey).setAppId(cfg.appId)
        .setTitle('Choose your leads sheet')
        .setCallback(d => { if (d.action === P.Action.PICKED && d.docs?.[0]) openSheet(d.docs[0].id, 'google'); })
        .build().setVisible(true);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Couldn’t open Google Picker.'); }
  });

  const connect = () => start(async () => {
    if (!sheet || !via) return;
    setErr('');
    const r = await connectSheet({ id: sheet.id, tab: sheet.tab, title: sheet.title, map, cardFields: card, via });
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
        <p className="sub">Use the sheet your Meta lead ads fill. Leadio reads it. It only writes to it if you later turn on “Save status into the sheet” in Settings.</p>

        {!via && (
          <>
            <a className="btn" href="/api/google/start">Connect Google (easiest)</a>
            <p className="sub" style={{ marginTop: -6 }}>Sign in with Google and pick your sheet. Leadio only gets the one sheet you pick.</p>
            <button className="btn light" onClick={() => setVia('link')}>Paste a sheet link instead</button>
          </>
        )}

        {via === 'google' && (
          <>
            <p className="ok">Google is connected. Now pick your leads sheet.</p>
            <button className="btn" onClick={pick} disabled={pending}>{pending && !sheet ? 'Opening…' : 'Choose your sheet'}</button>
          </>
        )}

        {via === 'link' && (
          <>
            <ol className="steps">
              <li>
                <b>Share the sheet with Leadio.</b> Open it, tap <b>Share</b>, and add this email as <b>Viewer</b>:
                {robot
                  ? <span className="robot"><code>{robot}</code><button type="button" className="pill" onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button></span>
                  : <span className="err">Sheet links aren’t set up on the server yet (GOOGLE_SERVICE_ACCOUNT_JSON).</span>}
              </li>
              <li><b>Paste the sheet’s link here.</b> Copy it from your browser’s address bar.</li>
            </ol>
            <label className="field">
              <span className="lbl">Google Sheet link</span>
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…" inputMode="url" autoComplete="off" />
            </label>
            <button className="btn" onClick={() => openSheet(url, 'link')} disabled={pending || !url.trim() || !robot}>{pending && !sheet ? 'Checking…' : 'Check sheet'}</button>
            {googleEnabled && <button className="btn light" onClick={() => { setVia(null); setErr(''); }}>Use Connect Google instead</button>}
          </>
        )}

        {err && !cols && <p className="err" role="alert">{err}</p>}

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
