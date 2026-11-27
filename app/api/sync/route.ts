import { NextResponse } from 'next/server';
import { activeCompany } from '@/lib/company';
import { syncCompany } from '@/lib/sync';

// POST /api/sync: pull new rows from the active company's sheets. Any member may trigger it;
// syncSource() skips sheets synced in the last 45 seconds.
export async function POST() {
  const company = await activeCompany();       // null when signed out or not a member
  if (!company) return NextResponse.json({ error: 'Sign in' }, { status: 401 });
  const results = await syncCompany(company.id);
  const added = results.reduce((n, r) => n + (r.added || 0), 0);
  const errors = results.filter(r => !r.ok).map(r => r.error);
  return NextResponse.json({ added, errors, synced: results.filter(r => !r.skipped).length }, { headers: { 'Cache-Control': 'no-store' } });
}
