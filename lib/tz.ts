// Server-side "today". Vercel runs in UTC, but follow-up dates are the user's local dates.
// All companies are in India for now; make this a per-company setting when that changes.
export const APP_TZ = 'Asia/Kolkata';

export function todayIn(tz = APP_TZ, now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

// Start of today / of the last 7 days in the app's time zone, as an ISO timestamp.
export function periodStart(p: 'today' | 'week' | 'all', tz = APP_TZ, now = new Date()): string | null {
  if (p === 'all') return null;
  const [y, m, d] = todayIn(tz, now).split('-').map(Number);
  // Midnight in tz: take UTC midnight of that date and shift by the zone's offset.
  const utcMidnight = Date.UTC(y, m - 1, d);
  const offsetMin = tzOffsetMinutes(tz, new Date(utcMidnight));
  const start = utcMidnight - offsetMin * 60000 - (p === 'week' ? 6 * 86400000 : 0);
  return new Date(start).toISOString();
}

function tzOffsetMinutes(tz: string, at: Date): number {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    .formatToParts(at).map(p => [p.type, p.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return Math.round((asUtc - +at) / 60000);
}
