import { describe, expect, it } from 'vitest';
import { fmtDay, followGroup, stats, fmtMins } from '@/lib/leads';
import { todayIn, periodStart } from '@/lib/tz';

const NOW = new Date(2026, 10, 27, 15, 0); // Fri 27 Nov 2026, 3 pm local

describe('fmtDay', () => {
  it('names nearby days', () => {
    expect(fmtDay('2026-11-27', NOW)).toBe('Today');
    expect(fmtDay('2026-11-28', NOW)).toBe('Tomorrow');
    expect(fmtDay('2026-11-26', NOW)).toBe('Yesterday');
    expect(fmtDay('2026-12-02', NOW)).toMatch(/2 Dec/);
    expect(fmtDay(null, NOW)).toBe('');
  });
});

describe('followGroup', () => {
  it('sorts follow-ups into groups', () => {
    expect(followGroup('2026-11-20', NOW)).toBe('Overdue');
    expect(followGroup('2026-11-27', NOW)).toBe('Today');
    expect(followGroup('2026-11-28', NOW)).toBe('Tomorrow');
    expect(followGroup('2026-12-03', NOW)).toBe('This week');
    expect(followGroup('2026-12-20', NOW)).toBe('Later');
  });
});

describe('stats', () => {
  const L = (status: string, campaign = 'A', mins: number | null = null) => ({
    status, campaign, lead_time: '2026-11-27T10:00:00Z',
    first_called_at: mins === null ? null : new Date(Date.parse('2026-11-27T10:00:00Z') + mins * 60000).toISOString(),
  });
  const s = stats([L('New'), L('No answer', 'A', 30), L('Interested', 'B', 10), L('Converted', 'B', 20), L('Wrong number', 'A', 5)]);
  it('counts reached, not connected, interested and converted', () => {
    expect(s.total).toBe(5);
    expect(s.reached).toBe(2);           // Interested + Converted
    expect(s.reachedPct).toBe(40);
    expect(s.notConnected).toBe(2);
    expect(s.warm).toBe(1);
    expect(s.converted).toBe(1);
  });
  it('averages time to first call', () => expect(s.avgFirstCallMins).toBe(16)); // (30+10+20+5)/4 = 16.25
  it('breaks down by campaign, biggest first', () => {
    expect(s.campaigns).toEqual([
      { name: 'A', leads: 3, reached: 0, converted: 0 },
      { name: 'B', leads: 2, reached: 2, converted: 1 },
    ]);
  });
  it('handles no leads', () => expect(stats([])).toMatchObject({ total: 0, reachedPct: 0, avgFirstCallMins: null }));
  it('formats minutes', () => {
    expect([fmtMins(null), fmtMins(16), fmtMins(135), fmtMins(4320)]).toEqual(['—', '16 min', '2h 15m', '3 days']);
  });
});

describe('time zone', () => {
  it('uses the India date even when UTC is still yesterday', () => {
    expect(todayIn('Asia/Kolkata', new Date('2026-11-26T20:00:00Z'))).toBe('2026-11-27'); // 1:30 am IST
  });
  it('starts "today" at midnight India time', () => {
    expect(periodStart('today', 'Asia/Kolkata', new Date('2026-11-27T06:00:00Z'))).toBe('2026-11-26T18:30:00.000Z');
    expect(periodStart('week', 'Asia/Kolkata', new Date('2026-11-27T06:00:00Z'))).toBe('2026-11-20T18:30:00.000Z');
    expect(periodStart('all')).toBeNull();
  });
});
