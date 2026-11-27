'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Lead } from '@/lib/types';
import { updateLead, logCall, logWhatsApp } from './actions';

export type CallSheet = { id: string; secs: number };

// Local, optimistic copy of the leads plus the call flow:
// tap Call → phone dialer opens → when the user comes back to the app, "How did the call go?" opens.
export function useLeads(initial: Lead[]) {
  const router = useRouter();
  const [leads, setLeads] = useState(initial);
  const [toast, setToastText] = useState('');
  const [sheet, setSheet] = useState<CallSheet | null>(null);
  const pending = useRef<{ id: string; t: number; hid: boolean } | null>(null);
  const tt = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => setLeads(initial), [initial]);

  const say = useCallback((m: string) => {
    setToastText(m); clearTimeout(tt.current); tt.current = setTimeout(() => setToastText(''), 2200);
  }, []);

  const patch = useCallback((id: string, p: Partial<Lead>) => setLeads(ls => ls.map(l => (l.id === id ? { ...l, ...p } : l))), []);

  // ---- call flow ----
  const resolveCall = useCallback(() => {
    const p = pending.current; if (!p) return;
    pending.current = null;
    setSheet({ id: p.id, secs: p.hid ? (Date.now() - p.t) / 1000 : 0 });
  }, []);

  const markCall = useCallback((id: string) => {
    pending.current = { id, t: Date.now(), hid: false };
    // Desktop / no dialer: the page never hides, so open the sheet after a moment anyway.
    setTimeout(() => { const p = pending.current; if (p && p.id === id && !p.hid && document.visibilityState === 'visible') resolveCall(); }, 2500);
  }, [resolveCall]);

  useEffect(() => {
    const onVis = () => {
      if (!pending.current) return;
      if (document.visibilityState === 'hidden') pending.current.hid = true;
      else setTimeout(resolveCall, 350);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [resolveCall]);

  // ---- saves (optimistic, rolled back on failure) ----
  const setStatus = useCallback(async (id: string, status: string) => {
    const prev = leads.find(l => l.id === id); if (!prev) return;
    const up: Partial<Lead> = { status };
    if (status === 'Follow-up' && !prev.follow_up) up.follow_up = addDays(1);
    patch(id, up); say(status + ' ✓');
    const r = await updateLead(id, { status, ...(up.follow_up ? { follow_up: up.follow_up } : {}) });
    if (!r.ok) { patch(id, { status: prev.status, follow_up: prev.follow_up }); say('Not saved. ' + r.error); }
  }, [leads, patch, say]);

  const setFollowUp = useCallback(async (id: string, follow_up: string | null) => {
    const prev = leads.find(l => l.id === id); if (!prev) return;
    patch(id, { follow_up }); say(follow_up ? 'Follow-up set' : 'Follow-up cleared');
    const r = await updateLead(id, { follow_up });
    if (!r.ok) { patch(id, { follow_up: prev.follow_up }); say('Not saved. ' + r.error); }
  }, [leads, patch, say]);

  const saveCall = useCallback(async (id: string, input: { status: string; follow_up: string | null; note: string }) => {
    const prev = leads.find(l => l.id === id); if (!prev) return;
    setSheet(null);
    patch(id, { status: input.status, follow_up: input.follow_up, attempts: prev.attempts + 1, last_called_at: new Date().toISOString() });
    say('Saved');
    const r = await logCall(id, input);
    if (!r.ok) { patch(id, prev); say('Not saved. ' + r.error); return; }
    patch(id, { attempts: r.attempts, first_called_at: r.first_called_at, last_called_at: r.last_called_at });
    router.refresh();
  }, [leads, patch, say, router]);

  const tapWhatsApp = useCallback((id: string) => { void logWhatsApp(id); }, []);

  return { leads, toast, say, sheet, setSheet, markCall, setStatus, setFollowUp, saveCall, tapWhatsApp };
}

export function addDays(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
