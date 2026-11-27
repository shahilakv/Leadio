'use client';
import Link from 'next/link';
import { STATUSES, ago, fmtWhen, fmtPhone, cleanPhone, waText, waLink, label, nice, statusOf, initials, fmtDay } from '@/lib/leads';
import type { Ctx, Lead } from '@/lib/types';

const AVS = ['#E4E0FA', '#F8DCE5', '#F3F4F6', '#DCF4EA'];
export const avatarBg = (id: string) => AVS[parseInt(id.replace(/\D/g, '').slice(-2) || '0', 10) % AVS.length];

export function StatusSelect({ value, onChange, big }: { value: string; onChange: (s: string) => void; big?: boolean }) {
  const s = statusOf(value);
  const opts = STATUSES.map(x => x.k); if (!opts.includes(value)) opts.unshift(value);
  return (
    <span className={'ssel' + (big ? ' big' : '')} style={{ ['--c' as string]: s.c, ['--t' as string]: s.t }}>
      <select value={value} onChange={e => onChange(e.target.value)} aria-label="Status">
        {opts.map(k => <option key={k}>{k}</option>)}
      </select>
    </span>
  );
}

export function whatsAppFor(l: Lead, ctx: Ctx) {
  const ph = cleanPhone(l.phone, ctx.countryCode); if (!ph) return '';
  const map = ctx.sources[l.source_id]?.field_map || {};
  return waLink(ph, waText(ctx.template, { name: l.name, type: map.type ? l.fields?.[map.type] : '', city: map.city ? l.fields?.[map.city] : '' }));
}

export function CallButtons({ lead: l, ctx, onCall, onWa }: { lead: Lead; ctx: Ctx; onCall: (id: string) => void; onWa: (id: string) => void }) {
  const ph = cleanPhone(l.phone, ctx.countryCode);
  if (!ph) return <div className="acts"><div className="nophone">No valid phone number</div></div>;
  return (
    <div className="acts">
      <a className="act call" href={'tel:+' + ph} onClick={() => onCall(l.id)}>☎ Call</a>
      <a className="act wa" href={whatsAppFor(l, ctx)} target="_blank" rel="noopener noreferrer" onClick={() => onWa(l.id)}>WhatsApp</a>
    </div>
  );
}

export default function LeadCard({ lead: l, ctx, onCall, onWa, onStatus }: {
  lead: Lead; ctx: Ctx; onCall: (id: string) => void; onWa: (id: string) => void; onStatus: (id: string, s: string) => void;
}) {
  const ph = cleanPhone(l.phone, ctx.countryCode);
  const src = ctx.sources[l.source_id];
  const map = src?.field_map || {};
  const extra = (src?.card_fields || []).filter(h => h !== map.name && h !== map.phone && l.fields?.[h]);
  const when = l.lead_time ? `${fmtWhen(l.lead_time)} · ${ago(l.lead_time)}` : '';
  const meta = [
    l.attempts ? `${l.attempts} call${l.attempts > 1 ? 's' : ''}` : '',
    l.last_called_at ? `last ${l.last_called_by && ctx.team[l.last_called_by] ? 'by ' + ctx.team[l.last_called_by] + ' ' : ''}${ago(l.last_called_at)}` : '',
    l.follow_up ? 'follow up ' + fmtDay(l.follow_up) : '',
  ].filter(Boolean).join(' · ');
  return (
    <article className="lc">
      <div className="ctop">
        <div className="av" style={{ background: avatarBg(l.id) }}>{initials(l.name || '?')}</div>
        <div style={{ flex: 1 }}>
          <div className="nm">{l.name || 'No name'}</div>
          {when && <span className="dt">{when}</span>}
        </div>
        <Link className="det" href={`/app/lead/${l.id}`}>Details ›</Link>
      </div>
      <div className="ph">{ph ? fmtPhone(ph) : l.phone || 'No phone number'}</div>
      {extra.length > 0 && (
        <div className="info">{extra.map(h => <span key={h}><small>{label(h)}</small>{nice(l.fields[h])}</span>)}</div>
      )}
      {meta && <p className="meta">{meta}</p>}
      <StatusSelect value={l.status} onChange={s => onStatus(l.id, s)} />
      <CallButtons lead={l} ctx={ctx} onCall={onCall} onWa={onWa} />
    </article>
  );
}
