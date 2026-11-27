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
export const REACHED = ['Follow-up', 'Interested', 'Visit booked', 'Converted', 'Not interested'];

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
export function ago(s: unknown, now = Date.now()): string {
  const d = parseDate(s); if (!d) return '';
  const m = (now - +d) / 60000;
  if (m < 1) return 'just now';
  if (m < 60) return Math.floor(m) + 'm ago';
  if (m < 1440) return Math.floor(m / 60) + 'h ago';
  return Math.floor(m / 1440) + 'd ago';
}
