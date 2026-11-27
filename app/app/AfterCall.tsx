'use client';
import { useEffect, useRef, useState } from 'react';
import { STATUSES, cleanPhone, fmtPhone, fmtDay } from '@/lib/leads';
import type { Lead } from '@/lib/types';
import { addDays } from './useLeads';

type SR = { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onerror: () => void; onend: () => void };

// "How did the call go?" bottom sheet. Opens when the user comes back from the phone dialer.
export default function AfterCall({ lead, secs, countryCode, onSave, onClose, say }: {
  lead: Lead | null; secs: number; countryCode: string;
  onSave: (id: string, v: { status: string; follow_up: string | null; note: string }) => void;
  onClose: () => void; say: (m: string) => void;
}) {
  const [status, setStatus] = useState('');
  const [fu, setFu] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [rec, setRec] = useState(false);
  const recRef = useRef<SR | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!lead) return;
    setStatus(lead.status === 'New' ? '' : lead.status);
    setFu(lead.follow_up); setNote('');
  }, [lead]);

  const stopMic = () => { try { recRef.current?.stop(); } catch { /* already stopped */ } recRef.current = null; setRec(false); };
  useEffect(() => () => stopMic(), []);

  const dictate = () => {
    if (recRef.current) return stopMic();
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition;
    const fallback = () => { stopMic(); taRef.current?.focus(); say('Tap the mic on your keyboard to speak'); };
    if (!Ctor) return fallback();
    try {
      const r = new Ctor(); r.lang = 'en-IN'; r.interimResults = false; r.continuous = false;
      r.onresult = e => { const t = Array.from(e.results).map(x => x[0].transcript).join(' '); setNote(n => (n ? n + ' ' : '') + t); };
      r.onerror = fallback; r.onend = () => { recRef.current = null; setRec(false); };
      r.start(); recRef.current = r; setRec(true); say('Listening… tap again to stop');
    } catch { fallback(); }
  };

  const pickStatus = (k: string) => { setStatus(k); if (k === 'Follow-up' && !fu) setFu(addDays(1)); };
  const save = () => {
    if (!lead) return;
    if (!status) return say('Pick how the call went');
    stopMic();
    onSave(lead.id, { status, follow_up: status === 'Follow-up' && !fu ? addDays(1) : fu, note: note.trim() });
  };

  const quick: [string, string][] = [['Tomorrow', addDays(1)], ['In 3 days', addDays(3)], ['Next week', addDays(7)]];
  const custom = !!fu && !quick.some(q => q[1] === fu);
  const ph = lead ? cleanPhone(lead.phone, countryCode) : '';
  const dur = secs > 4 ? ` · ${Math.floor(secs / 60) ? Math.floor(secs / 60) + 'm ' : ''}${Math.round(secs % 60)}s` : '';

  return (
    <>
      <div className={'ov' + (lead ? ' on' : '')} onClick={() => { stopMic(); onClose(); }} />
      <div className={'sheet' + (lead ? ' on' : '')} role="dialog" aria-modal="true" aria-label="How did the call go?">
        <div className="grab" />
        {lead && (
          <>
            <div>
              <span className="ended">☎ Call ended{dur}</span>
              <h2>How did the call go?</h2>
              <p className="sub">{lead.name}{ph ? ' · ' + fmtPhone(ph) : ''}</p>
            </div>
            <div className="sgrid">
              {STATUSES.map(s => (
                <button key={s.k} className={'opt' + (status === s.k ? ' on' : '')} style={{ ['--c' as string]: s.c, ['--t' as string]: s.t }} onClick={() => pickStatus(s.k)}>
                  <i /><span>{s.k}</span>{status === s.k && <b aria-hidden>✓</b>}
                </button>
              ))}
            </div>
            <div>
              <div className="lbl">Follow up on</div>
              <div className="qd">
                {quick.map(([t, d]) => <button key={t} className={fu === d ? 'on' : ''} onClick={() => setFu(fu === d ? null : d)}>{t}</button>)}
                <label className={'cal' + (custom ? ' on' : '')} aria-label="Pick a date">📅<input type="date" value={fu || ''} onChange={e => setFu(e.target.value || null)} /></label>
                {fu && <span className="when">{fmtDay(fu)} · <button className="clear" onClick={() => setFu(null)}>clear</button></span>}
              </div>
            </div>
            <div>
              <div className="lbl">Note</div>
              <div className="nbox">
                <textarea ref={taRef} rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Type a note, or tap the mic and speak" maxLength={4000} />
                <button className={'mic' + (rec ? ' rec' : '')} onClick={dictate} aria-label="Speak a note">🎤</button>
              </div>
            </div>
            <button className="btn" onClick={save}>Save</button>
          </>
        )}
      </div>
    </>
  );
}
