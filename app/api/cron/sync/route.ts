import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { syncSource } from '@/lib/sync';
import { safeEqual } from '@/lib/crypto';

// POST /api/cron/sync: called every 2 minutes by Supabase pg_cron (supabase/setup/cron.sql)
// with "Authorization: Bearer <CRON_SECRET>". Syncs every connected sheet, a few at a time,
// skipping sheets an open app synced in the last 45 seconds.
export const maxDuration = 60;
const PARALLEL = 5;

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const got = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!secret || !got || !safeEqual(got, secret)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const started = Date.now();
  const { data } = await supabaseAdmin().from('sheet_sources').select('id').order('last_synced_at', { ascending: true, nullsFirst: true });
  const ids = (data ?? []).map(s => s.id);
  let synced = 0, added = 0, failed = 0, skipped = 0;
  for (let i = 0; i < ids.length; i += PARALLEL) {
    if (Date.now() - started > 50_000) break;              // leave the rest for the next run
    const rs = await Promise.all(ids.slice(i, i + PARALLEL).map(id => syncSource(id)));
    for (const r of rs) { if (r.skipped) skipped++; else if (r.ok) { synced++; added += r.added || 0; } else failed++; }
  }
  return NextResponse.json({ sources: ids.length, synced, skipped, failed, added, ms: Date.now() - started });
}
