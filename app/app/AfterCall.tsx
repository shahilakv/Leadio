'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { STATUSES, cleanPhone, fmtPhone, fmtDay } from '@/lib/leads';
import type { Lead } from '@/lib/types';
import { addDays } from './useLeads';
import { PhoneIcon, CalendarIcon, MicIcon, WhatsAppIcon } from '@/app/Icons';

type SR = { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onerror: () => void; onend: () => void };

// "How did the call go?" bottom sheet. Opens when the user comes back from the phone dialer.
// Step 1: pick a result (required) and Save. Step 2: optional WhatsApp message to the lead, then close.
export default function AfterCall({ lead, secs, countryCode, wa, onSave, onWa, onClose, say }: {
  lead: Lead | null; secs: number; countryCode: string;
  wa: { href: string; text: string } | null;
  onSave: (id: string, v: { status: string; follow_up: string | null; note: string }) => void;
  onWa: (id: string) => void;
  onClose: () => void; say: (m: string) => void;
}) {
  const [step, setStep] = useState<'result' | 'wa'>('result');
  const [status, setStatus] = useState('');
  const [fu, setFu] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [rec, setRec] = useState(false);
  const recRef = useRef<SR | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Reset only when a different lead's call opens (saving changes the lead object but not its id).
  const leadId = lead?.id;
  useEffect(() => {
    if (!lead) return;
    setStep('result');
    setStatus(lead.status === 'New' ? '' : lead.status);
    setFu(lead.follow_up); setNote('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

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
    if (!status || status === 'New') return say('Pick how the call went');
    stopMic();
    onSave(lead.id, { status, follow_up: status === 'Follow-up' && !fu ? addDays(1) : fu, note: note.trim() });
    if (wa?.href) setStep('wa'); else onClose();
  };

  const quick: [string, string][] = [['Tomorrow', addDays(1)], ['In 3 days', addDays(3)], ['Next week', addDays(7)]];
  const custom = !!fu && !quick.some(q => q[1] === fu);
  const ph = lead ? cleanPhone(lead.phone, countryCode) : '';
  const dur = secs > 4 ? ` · ${Math.floor(secs / 60) ? Math.floor(secs / 60) + 'm ' : ''}${Math.round(secs % 60)}s` : '';

  // Rendered into <body> through a portal, so no animated/transformed parent can move this fixed sheet.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // While the sheet is open the page behind it is pinned in place (position:fixed on <body>).
  // overflow:hidden alone isn't enough on iPhone: drags still move the page and the address bar,
  // which shifts the sheet.
  const open = !!lead;
  useEffect(() => {
    if (!open) return;
    const y = window.scrollY, b = document.body.style;
    const prev = { position: b.position, top: b.top, left: b.left, right: b.right, width: b.width };
    document.documentElement.classList.add('locked');
    Object.assign(b, { position: 'fixed', top: `-${y}px`, left: '0', right: '0', width: '100%' });
    // iPhone Safari still rubber-bands the screen on drags, whatever the CSS says. So while the sheet
    // is open, cancel every touch drag except one that scrolls the sheet's body and still has room to go.
    let startY = 0;
    const onStart = (e: TouchEvent) => { startY = e.touches[0]?.clientY ?? 0; };
    const onMove = (e: TouchEvent) => {
      if (e.touches.length > 1) { e.preventDefault(); return; }               // no pinch while open
      const body = (e.target as Element | null)?.closest?.('.sbody') as HTMLElement | null;
      if (!body || body.scrollHeight <= body.clientHeight + 1) { e.preventDefault(); return; }
      const dy = (e.touches[0]?.clientY ?? 0) - startY;                    // > 0: finger moving down
      const atTop = body.scrollTop <= 0;
      const atBottom = body.scrollTop + body.clientHeight >= body.scrollHeight - 1;
      if ((dy > 0 && atTop) || (dy < 0 && atBottom)) e.preventDefault();
    };
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: false });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      Object.assign(b, prev);
      document.documentElement.classList.remove('locked');
      window.scrollTo(0, y);
    };
  }, [open]);

  // After Save the sheet slides away; for a moment an invisible shield catches stray taps so they
  // can't land on the card underneath (e.g. its WhatsApp button).
  const [shield, setShield] = useState(false);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open) {
      setShield(true);
      const t = setTimeout(() => setShield(false), 700);
      wasOpen.current = open;
      return () => clearTimeout(t);
    }
    wasOpen.current = open;
  }, [open]);

  if (!mounted) return null;
  const ready = !!status && status !== 'New';

  return createPortal(
    <>
      {/* Step 1 can't be closed by tapping outside (a call must get a result). Step 2 can: the result is saved. */}
      <div className={'ov' + (lead ? ' on' : shield ? ' shield' : '')}
        onClick={() => { if (!lead) return; if (step === 'wa') onClose(); else say('Choose how the call went to continue'); }} />
      <div className={'sheet withfoot' + (lead ? ' on' : '')} role="dialog" aria-modal="true" aria-label={step === 'wa' ? 'Send a WhatsApp message?' : 'How did the call go?'}>
        {lead && step === 'wa' && wa && (
          <>
          <div className="sbody">
            <div className="grab" />
            <div>
              <span className="ended">✓ Saved · {status}</span>
              <h2>Send a WhatsApp message?</h2>
              <p className="sub">To {lead.name}{ph ? ' · ' + fmtPhone(ph) : ''}</p>
            </div>
            <div className="waprev">
              <span className="lbl">Message</span>
              <p>{wa.text}</p>
              <span className="sub" style={{ fontSize: 12.5 }}>You can edit it in WhatsApp before sending.</span>
            </div>
          </div>
          <div className="sfoot" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a className="savebtn wabtn" href={wa.href} target="_blank" rel="noopener noreferrer"
              onClick={() => { onWa(lead.id); onClose(); }}>
              <WhatsAppIcon size={20} />Send on WhatsApp
            </a>
            <button className="skipbtn" onClick={onClose}>Skip</button>
          </div>
          </>
        )}
        {lead && step === 'result' && (
          <>
          <div className="sbody">
            <div className="grab" />
            <div>
              <span className="ended"><PhoneIcon size={13} />Call ended{dur}</span>
              <h2>How did the call go?</h2>
              <p className="sub">{lead.name}{ph ? ' · ' + fmtPhone(ph) : ''}</p>
              <p className="sub" style={{ marginTop: 4 }}>Choose a result, then save.</p>
            </div>
            <div className="sgrid">
              {STATUSES.filter(s => s.k !== 'New').map(s => (
                <button key={s.k} className={'opt' + (status === s.k ? ' on' : '')} style={{ ['--c' as string]: s.c, ['--t' as string]: s.t }} onClick={() => pickStatus(s.k)}>
                  <i /><span>{s.k}</span>{status === s.k && <b aria-hidden>✓</b>}
                </button>
              ))}
            </div>
            <div>
              <div className="lbl">Follow up on</div>
              <div className="qd">
                {quick.map(([t, d]) => <button key={t} className={fu === d ? 'on' : ''} onClick={() => setFu(fu === d ? null : d)}>{t}</button>)}
                <label className={'cal' + (custom ? ' on' : '')} aria-label="Pick a date"><CalendarIcon size={17} /><input type="date" value={fu || ''} onChange={e => setFu(e.target.value || null)} /></label>
                {fu && <span className="when">{fmtDay(fu)} · <button className="clear" onClick={() => setFu(null)}>clear</button></span>}
              </div>
            </div>
            <div>
              <div className="lbl">Note</div>
              <div className="nbox">
                <textarea ref={taRef} rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Type a note, or tap the mic and speak" maxLength={4000} />
                <button className={'mic' + (rec ? ' rec' : '')} onClick={dictate} aria-label="Speak a note"><MicIcon size={19} /></button>
              </div>
            </div>
          </div>
          {/* Always visible at the bottom of the sheet, however far the content scrolls. */}
          <div className="sfoot">
            <button className={'savebtn' + (ready ? ' ready' : '')} onClick={save} disabled={!ready}>
              {ready ? <>Save · {status}</> : 'Choose a result above'}
            </button>
          </div>
          </>
        )}
      </div>
    </>,
    document.body,
  );
}
