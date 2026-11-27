'use client';
import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cleanPhone, fmtPhone, fmtWhen, ago, fmtDay, label, nice, fmtValue, initials, statusOf } from '@/lib/leads';
import type { Activity, Ctx, Lead } from '@/lib/types';
import { StatusSelect, CallButtons, avatarBg, waParts } from '../../LeadCard';
import AfterCall from '../../AfterCall';
import { useLeads } from '../../useLeads';
import { addNote } from '../../actions';

const KIND: Record<Activity['kind'], string> = { call: 'Call', whatsapp: 'WhatsApp opened', status: 'Status changed', note: 'Note' };

export default function LeadDetail({ lead, ctx, activity, names }: { lead: Lead; ctx: Ctx; activity: Activity[]; names: Record<string, string> }) {
  const router = useRouter();
  const initial = useMemo(() => [lead], [lead]);
  const L = useLeads(initial);
  const l = L.leads[0] ?? lead;
  const [note, setNote] = useState('');
  const [saving, start] = useTransition();

  const ph = cleanPhone(l.phone, ctx.countryCode);
  const src = ctx.sources[l.source_id];
  const map = src?.field_map || {};
  const shownKeys = new Set([map.name, map.phone, map.city, map.type, map.campaign, map.time].filter(Boolean));
  const answers = Object.entries(l.fields || {}).filter(([k, v]) => v && !shownKeys.has(k));

  const save = () => start(async () => {
    const r = await addNote(l.id, note);
    if (!r.ok) return L.say(r.error);
    setNote(''); L.say('Note saved'); router.refresh();
  });

  return (
    <>
      <div className="hd">
        <Link className="pill" href="/app" aria-label="Back to leads">‹ Back</Link>
        <div className="grow" />
      </div>

      <div className="ctop" style={{ marginBottom: 14 }}>
        <div className="av" style={{ background: avatarBg(l.id), width: 56, height: 56, fontSize: 18 }}>{initials(l.name || '?')}</div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 24 }}>{l.name || 'No name'}</h1>
          {l.lead_time && <span className="dt">Came in {fmtWhen(l.lead_time)} · {ago(l.lead_time)}</span>}
        </div>
      </div>

      <div className="card">
        <div><span className="lbl">Phone</span><div className="ph">{ph ? fmtPhone(ph) : l.phone || 'No phone number'}</div></div>
        <CallButtons lead={l} ctx={ctx} onCall={L.markCall} onWa={L.tapWhatsApp} />
      </div>

      <div className="card" style={{ marginTop: 10 }}>
        <div><span className="lbl">Status</span><StatusSelect big value={l.status} onChange={s => L.setStatus(l.id, s)} /></div>
        <label className="field">
          <span className="lbl">Follow up {l.follow_up ? `· ${fmtDay(l.follow_up)}` : ''}</span>
          <input type="date" value={l.follow_up || ''} onChange={e => L.setFollowUp(l.id, e.target.value || null)} />
        </label>
        {l.attempts > 0 && <p className="sub">{l.attempts} call{l.attempts > 1 ? 's' : ''}{l.last_called_at ? ` · last ${l.last_called_by && ctx.team[l.last_called_by] ? 'by ' + ctx.team[l.last_called_by] + ' ' : ''}${ago(l.last_called_at)}` : ''}</p>}
      </div>

      {(map.city || map.type || l.campaign) && (
        <div className="info" style={{ marginTop: 10 }}>
          {map.city && l.fields[map.city] && <span><small>City</small>{l.fields[map.city]}</span>}
          {map.type && l.fields[map.type] && <span><small>Looking for</small>{nice(l.fields[map.type])}</span>}
          {l.campaign && <span><small>Campaign</small>{l.campaign}</span>}
        </div>
      )}

      <div className="card" style={{ marginTop: 10 }}>
        <h3 style={{ fontSize: 16 }}>Notes and history</h3>
        <div className="nbox">
          <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note" maxLength={4000} aria-label="New note" />
        </div>
        <button className="btn" onClick={save} disabled={saving || !note.trim()}>{saving ? 'Saving…' : 'Save note'}</button>
        {activity.length ? (
          <ul className="hist">
            {activity.map(a => (
              <li key={a.id} style={a.status ? { ['--c' as string]: statusOf(a.status).c } : undefined}>
                <i />
                <div>
                  <small>{fmtWhen(a.created_at)} · {names[a.user_id] || 'Team member'}</small>
                  <p><b>{KIND[a.kind]}{a.status ? `: ${a.status}` : ''}</b>{a.body ? ` — ${a.body}` : ''}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="sub">No notes yet. Notes and call results show up here.</p>}
      </div>

      {answers.length > 0 && (
        <div className="card" style={{ marginTop: 10, gap: 0 }}>
          <h3 style={{ fontSize: 16, marginBottom: 6 }}>Form answers</h3>
          {answers.map(([k, v]) => <div className="ans" key={k}><span>{label(k)}</span><b>{fmtValue(v)}</b></div>)}
        </div>
      )}

      <AfterCall lead={L.sheet ? l : null} secs={L.sheet?.secs || 0} countryCode={ctx.countryCode} wa={waParts(l, ctx)} onWa={L.tapWhatsApp} onSave={L.saveCall} onClose={() => L.setSheet(null)} say={L.say} />
      <div className={'toast' + (L.toast ? ' on' : '')} role="status">{L.toast}</div>
    </>
  );
}
