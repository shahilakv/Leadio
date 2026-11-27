import Link from 'next/link';
import { activeCompany } from '@/lib/company';
import { supabaseServer } from '@/lib/supabase/server';
import { stats, fmtMins } from '@/lib/leads';
import { periodStart } from '@/lib/tz';

export const metadata = { title: 'Stats · Leadio' };
export const dynamic = 'force-dynamic';

const PERIODS = [['today', 'Today'], ['week', 'This week'], ['all', 'All time']] as const;
type P = typeof PERIODS[number][0];

export default async function Stats({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p: raw } = await searchParams;
  const p: P = raw === 'today' || raw === 'week' ? raw : 'all';
  const company = (await activeCompany())!;
  const sb = await supabaseServer();
  const since = periodStart(p);

  let leadsQ = sb.from('leads').select('status, lead_time, first_called_at, campaign').eq('company_id', company.id).limit(20000);
  let callsQ = sb.from('lead_activity').select('user_id').eq('company_id', company.id).eq('kind', 'call').limit(20000);
  if (since) { leadsQ = leadsQ.gte('lead_time', since); callsQ = callsQ.gte('created_at', since); }
  const [{ data: leads }, { data: calls }] = await Promise.all([leadsQ, callsQ]);

  const s = stats(leads ?? []);
  const byUser = new Map<string, number>();
  for (const c of calls ?? []) byUser.set(c.user_id, (byUser.get(c.user_id) || 0) + 1);
  const ids = [...byUser.keys()];
  const { data: people } = ids.length ? await sb.from('profiles').select('id, full_name, email').in('id', ids) : { data: [] };
  const name = (id: string) => { const x = (people ?? []).find(v => v.id === id); return x?.full_name || x?.email || 'Team member'; };
  const max = Math.max(1, ...s.byStatus.map(b => b.n));
  const word = p === 'today' ? 'today' : p === 'week' ? 'in the last 7 days' : 'in total';

  return (
    <>
      <div className="hd"><div className="grow h1">Stats</div></div>
      <nav className="seg" aria-label="Period">
        {PERIODS.map(([k, t]) => <Link key={k} href={`/app/stats?p=${k}`} className={p === k ? 'on' : ''}>{t}</Link>)}
      </nav>

      <div className="hero">
        <span>Leads reached</span>
        <b>{s.reachedPct}%</b>
        <p>{s.reached} of {s.total} leads {word} were reached on the phone.</p>
      </div>

      <div className="grid2">
        <div className="st"><span>New leads</span><b>{s.total}</b><small>{word}</small></div>
        <div className="st"><span>Calls made</span><b>{calls?.length ?? 0}</b><small>{word}</small></div>
        <div className="st" style={{ background: 'var(--pink)' }}><span>Not connected</span><b>{s.notConnected}</b><small>new or no answer</small></div>
        <div className="st" style={{ background: 'var(--lav)' }}><span>Interested</span><b>{s.warm}</b><small>incl. visit booked</small></div>
      </div>

      <div className="box">
        <h3>Avg. time to first call</h3>
        <p style={{ fontSize: 28, fontWeight: 800 }}>{fmtMins(s.avgFirstCallMins)}</p>
        <p className="sub">From the moment a lead came in to the first call. Faster calls convert better.</p>
      </div>

      <div className="box">
        <h3>By status</h3>
        {s.byStatus.map(b => (
          <div key={b.k} className="bar" style={{ ['--c' as string]: b.c }}>
            <span>{b.k}</span><i><em style={{ width: `${(b.n / max) * 100}%` }} /></i><b>{b.n}</b>
          </div>
        ))}
      </div>

      {byUser.size > 0 && (
        <div className="box">
          <h3>Calls by team member</h3>
          <table className="tbl"><tbody>
            {[...byUser.entries()].sort((a, b) => b[1] - a[1]).map(([id, n]) => <tr key={id}><td>{name(id)}</td><td>{n}</td></tr>)}
          </tbody></table>
        </div>
      )}

      {s.campaigns.length > 1 && (
        <div className="box">
          <h3>By campaign</h3>
          <table className="tbl">
            <thead><tr><th>Campaign</th><th>Leads</th><th>Reached</th><th>Converted</th></tr></thead>
            <tbody>
              {s.campaigns.map(c => <tr key={c.name}><td>{c.name}</td><td>{c.leads}</td><td>{Math.round((c.reached / c.leads) * 100)}%</td><td>{c.converted}</td></tr>)}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
