'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ago } from '@/lib/leads';
import { syncNow, sheetHeaders, setStatusColumn, removeSheet } from './sheetActions';

export type SheetRow = { id: string; label: string; tab_title: string; connection: string; status_column: string | null; last_synced_at: string | null; last_error: string | null; leads: number };

export default function SheetsPanel({ sources, owner, robot }: { sources: SheetRow[]; owner: boolean; robot: string | null }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});
  const [pending, start] = useTransition();

  const sync = () => start(async () => {
    setMsg({});
    const r = await syncNow();
    setMsg(r.ok ? { ok: r.added ? `${r.added} new lead${r.added === 1 ? '' : 's'} added · ${r.total} in your sheets` : `Up to date · ${r.total} leads in your sheets` } : { error: r.error });
    router.refresh();
  });

  return (
    <div className="card" style={{ marginTop: 10 }}>
      <span className="lbl" style={{ margin: 0 }}>Connected sheets</span>
      {sources.length ? sources.map(s => <SheetItem key={s.id} s={s} owner={owner} robot={robot} />) : <p className="sub">No sheet connected yet.</p>}
      {sources.length > 0 && <button className="btn" onClick={sync} disabled={pending}>{pending ? 'Syncing…' : '↻ Sync now'}</button>}
      {msg.error && <p className="err" role="alert">{msg.error}</p>}
      {msg.ok && <p className="ok" role="status">{msg.ok}</p>}
      {owner && <Link className="btn light" href="/onboarding/sheet">{sources.length ? 'Connect another sheet' : 'Connect a sheet'}</Link>}
    </div>
  );
}

function SheetItem({ s, owner, robot }: { s: SheetRow; owner: boolean; robot: string | null }) {
  const router = useRouter();
  const [headers, setHeaders] = useState<string[] | null>(null);
  const [choice, setChoice] = useState(s.status_column || '');
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);

  const remove = () => start(async () => {
    setMsg({});
    const r = await removeSheet(s.id);
    if (!r.ok) { setConfirm(false); return setMsg({ error: r.error }); }
    router.refresh();
  });

  const edit = () => start(async () => {
    setMsg({});
    const r = await sheetHeaders(s.id);
    if (!r.ok) return setMsg({ error: r.error });
    setHeaders(r.headers);
    setChoice(s.status_column || (r.headers.includes('Lead Desk Status') ? 'Lead Desk Status' : '__new__'));
  });
  const save = () => start(async () => {
    setMsg({});
    const r = await setStatusColumn(s.id, choice);
    if (!r.ok) return setMsg({ error: r.error });
    setHeaders(null);
    setMsg({ ok: r.column ? `Statuses now save into “${r.column}”. ${r.written} rows updated.` : 'Statuses no longer save into the sheet.' });
    router.refresh();
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
      <div>
        <b>{s.label || 'Google Sheet'}</b> <span className="sub">· tab “{s.tab_title}” · {s.connection === 'oauth' ? 'via Google' : 'via link'}</span>
        <p className="sub">{s.leads} lead{s.leads === 1 ? '' : 's'} · {s.last_synced_at ? `last checked ${ago(s.last_synced_at)}` : 'not synced yet'}</p>
        <p className="sub">Status in the sheet: <b style={{ color: 'var(--ink)' }}>{s.status_column ? `saved into “${s.status_column}”` : 'off'}</b></p>
      </div>
      {s.last_error && <p className="err">{s.last_error}</p>}

      {owner && !headers && <button className="btn light" onClick={edit} disabled={pending}>{pending ? 'Loading…' : s.status_column ? 'Change status column' : 'Save status into the sheet'}</button>}
      {owner && headers && (
        <>
          <p className="sub">When someone changes a lead’s status in Lead Desk, it’s written into this column of the sheet.
            {s.connection !== 'oauth' && robot && <> The sheet must be shared with <b>{robot}</b> as <b>Editor</b>.</>}</p>
          <label className="field">
            <span className="lbl">Status column</span>
            <select value={choice} onChange={e => setChoice(e.target.value)}>
              <option value="">Off (don’t write to the sheet)</option>
              {!headers.includes('Lead Desk Status') && <option value="__new__">+ Add a new “Lead Desk Status” column</option>}
              {headers.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </label>
          <div className="acts">
            <button className="act" style={{ background: 'var(--soft)' }} onClick={() => setHeaders(null)} disabled={pending}>Cancel</button>
            <button className="act call" onClick={save} disabled={pending}>{pending ? 'Saving…' : 'Save'}</button>
          </div>
        </>
      )}
      {owner && !headers && !confirm && (
        <button className="btn light" style={{ color: 'var(--red)' }} onClick={() => setConfirm(true)} disabled={pending}>Remove this sheet</button>
      )}
      {owner && confirm && (
        <div className="err" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span>Remove “{s.label || 'this sheet'}”? Its <b>{s.leads} lead{s.leads === 1 ? '' : 's'}</b> and all their calls, statuses and notes will be deleted from Lead Desk. This can’t be undone. Your Google Sheet itself isn’t changed.</span>
          <div className="acts">
            <button className="act" style={{ background: 'var(--card)', color: 'var(--ink)' }} onClick={() => setConfirm(false)} disabled={pending}>Cancel</button>
            <button className="act" style={{ background: 'var(--red)', color: '#fff' }} onClick={remove} disabled={pending}>{pending ? 'Removing…' : 'Yes, remove'}</button>
          </div>
        </div>
      )}
      {msg.error && <p className="err" role="alert">{msg.error}</p>}
      {msg.ok && <p className="ok" role="status">{msg.ok}</p>}
    </div>
  );
}
