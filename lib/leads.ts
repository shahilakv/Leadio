// Lead rules shared by the server (sync) and the browser (cards). Ported from the v1 single-file app.

export type Status = { k: string; c: string; t: string };

// Single source of truth for statuses. "Converted" replaces v1's Ibna-specific "Rented".
export const STATUSES: Status[] = [
  { k: 'New',            c: '#3B6FF2', t: '#E4ECFF' },
  { k: 'No answer',      c: '#B57C00', t: '#FFF2CC' },
  { k: 'Follow-up',      c: '#7C5CF0', t: '#EEE8FF' },
  { k: 'Interested',     c: '#0E9567', t: '#DCF4EA' },
  { k: 'Visit booked',   c: '#0A84A6', t: '#DAF1F7' },
  { k: 'Converted',      c: '#1E6B2E', t: '#D7F36B' },
  { k: 'Not interested', c: '#6F737C', t: '#ECEDF0' },
  { k: 'Wrong number',   c: '#D63A2B', t: '#FDE3E0' },
];
export const NOTCONN = ['New', 'No answer'];
export const WARM = ['Interested', 'Visit booked'];
export const CLOSED = ['Converted', 'Not interested', 'Wrong number'];
// The Follow-ups tab: leads to call again.
export const FOLLOW_STATUSES = ['No answer', 'Follow-up'];
export const REACHED =['Follow-up', 'Interested', 'Visit booked', 'Converted', 'Not interested'];

// ---------- field mapping ----------
// The app's own meaning for a column. Name and phone are required; the rest are optional.
export const ROLES = ['name', 'phone', 'time', 'campaign', 'city', 'type'] as const;
export type Role = typeof ROLES[number];
export type FieldMap = Partial<Record<Role, string>>;

// Best guess of which sheet header plays which role (Meta's default headers work out of the box).
export function guessFieldMap(headers: string[]): FieldMap {
  const f = (re: RegExp) => headers.find(h => re.test(h)) || undefined;
  return {
    name: f(/^full.?name$/i) || f(/^name$/i) || f(/name/i),
    phone: f(/phone|mobile|whats|contact.?n/i),
    time: f(/created.?time/i) || f(/^date|timestamp|submitted|time/i),
    campaign: f(/campaign.?name/i) || f(/^campaign$/i),
    city: f(/city/i) || f(/location|area/i),
    type: f(/furnish/i) || f(/apartment.?type|prefer|looking.?for/i),
  };
}

// Readable label for a sheet header: "which_type_of_apartment?" -> "Which type of apartment?"
export const label = (k: string) => String(k).replace(/_/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\w/, c => c.toUpperCase());
// Readable value: "non_furnished" -> "Non furnished"
export const nice = (v: unknown) => String(v ?? '').replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());

// ---------- phones ----------
// Digits with country code, or '' if it doesn't look like a phone number. Meta adds a "p:" prefix.
export function cleanPhone(p: unknown, countryCode = '91'): string {
  if (!p) return '';
  const raw = String(p).replace(/^p:/i, '').trim();
  const plus = raw.startsWith('+');
  let d = raw.replace(/\D/g, '');
  if (!plus) {
    if (d.startsWith('00')) d = d.slice(2);
    else if (d.length === 11 && d.startsWith('0')) d = countryCode + d.slice(1);
    else if (d.length <= 10) d = countryCode + d;
  }
  return d.length >= 8 ? d : '';
}

export function fmtPhone(d: string): string {
  if (!d) return '';
  if (d.startsWith('91') && d.length === 12) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  if (d.startsWith('971') && d.length === 12) return `+971 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
  return '+' + d;
}

// WhatsApp message from the company's template. Placeholders: {name} (first name), {type}, {city}.
export function waText(template: string, v: { name?: string; type?: string; city?: string }): string {
  const first = String(v.name || '').trim().split(/\s+/)[0] || 'there';
  return template
    .replace(/\{name\}/g, first)
    .replace(/\{type\}/g, nice(v.type).toLowerCase())
    .replace(/ in \{city\}/g, v.city ? ' in ' + v.city : '')
    .replace(/\{city\}/g, v.city || '')
    .replace(/ {2,}/g, ' ');
}
export const waLink = (phone: string, text: string) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

// ---------- dates ----------
// Parses Meta's "2026-10-24T05:56:05-0500" / "-05:00" and "2026-10-24 05:56" forms.
export function parseDate(s: unknown): Date | null {
  if (!s) return null;
  const d = new Date(String(s).trim().replace(/([+-]\d\d)(\d\d)$/, '$1:$2').replace(/^(\d{4}-\d\d-\d\d) /, '$1T'));
  return isNaN(+d) ? null : d;
}
export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// "24 Oct, 5:56 pm" (adds the year when it's not this year)
export function fmtWhen(s: unknown): string {
  const d = parseDate(s); if (!d) return '';
  const o: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' };
  if (d.getFullYear() !== new Date().getFullYear()) o.year = 'numeric';
  return d.toLocaleString('en-IN', o);
}
// "Today", "Tomorrow", "Yesterday" or "Mon, 30 Nov" for a YYYY-MM-DD date.
export function fmtDay(s: string | null | undefined, now = new Date()): string {
  if (!s) return '';
  const day = (n: number) => { const d = new Date(now); d.setDate(d.getDate() + n); return ymd(d); };
  if (s === day(0)) return 'Today';
  if (s === day(1)) return 'Tomorrow';
  if (s === day(-1)) return 'Yesterday';
  const d = parseDate(s + 'T00:00');
  return d ? d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : s;
}

// Follow-ups screen groups. Closed leads (Converted, Not interested, Wrong number) are left out.
export const FOLLOW_GROUPS = ['Overdue', 'Today', 'Tomorrow', 'This week', 'Later', 'No date set'] as const;
export function followGroup(followUp: string | null, now = new Date()): typeof FOLLOW_GROUPS[number] {
  if (!followUp) return 'No date set';
  const day = (n: number) => { const d = new Date(now); d.setDate(d.getDate() + n); return ymd(d); };
  if (followUp < day(0)) return 'Overdue';
  if (followUp === day(0)) return 'Today';
  if (followUp === day(1)) return 'Tomorrow';
  if (followUp <= day(7)) return 'This week';
  return 'Later';
}

// Numbers for the Stats screen, over the leads that came in during the period.
export type StatLead = { status: string; lead_time: string | null; first_called_at: string | null; campaign: string };
export function stats(leads: StatLead[]) {
  const total = leads.length;
  const reached = leads.filter(l => REACHED.includes(l.status)).length;
  const byStatus = STATUSES.map(s => ({ ...s, n: leads.filter(l => l.status === s.k).length }));
  const waits = leads
    .map(l => (l.first_called_at && l.lead_time ? (+new Date(l.first_called_at) - +new Date(l.lead_time)) / 60000 : null))
    .filter((m): m is number => m !== null && m >= 0);
  const avgFirstCallMins = waits.length ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : null;
  const camps = new Map<string, { leads: number; reached: number; converted: number }>();
  for (const l of leads) {
    const k = l.campaign || 'No campaign';
    const c = camps.get(k) || { leads: 0, reached: 0, converted: 0 };
    c.leads++; if (REACHED.includes(l.status)) c.reached++; if (l.status === 'Converted') c.converted++;
    camps.set(k, c);
  }
  return {
    total, reached, reachedPct: total ? Math.round((reached / total) * 100) : 0,
    notConnected: leads.filter(l => NOTCONN.includes(l.status)).length,
    warm: leads.filter(l => WARM.includes(l.status)).length,
    converted: leads.filter(l => l.status === 'Converted').length,
    byStatus, avgFirstCallMins,
    campaigns: [...camps.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.leads - a.leads),
  };
}
export function fmtMins(m: number | null): string {
  if (m === null) return '—';
  if (m < 60) return `${m} min`;
  if (m < 1440) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return `${Math.round(m / 1440)} days`;
}

// A sheet value as people read it: ISO dates/times become "24 Oct, 5:56 pm", snake_case becomes words.
export function fmtValue(v: unknown): string {
  const s = String(v ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}([T ]\d{1,2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/.test(s)) {
    if (s.length === 10) { const d = parseDate(s + 'T00:00'); return d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : s; }
    const w = fmtWhen(s); if (w) return w;
  }
  return nice(s);
}

export const statusOf = (s: string) => STATUSES.find(x => x.k === s) ?? { k: s, c: '#6F737C', t: '#ECEDF0' };
export const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

export function ago(s: unknown, now = Date.now()): string {
  const d = parseDate(s); if (!d) return '';
  const m = (now - +d) / 60000;
  if (m < 1) return 'just now';
  if (m < 60) return Math.floor(m) + 'm ago';
  if (m < 1440) return Math.floor(m / 60) + 'h ago';
  return Math.floor(m / 1440) + 'd ago';
}
