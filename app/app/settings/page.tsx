import Link from 'next/link';
import { activeCompany } from '@/lib/company';
import { currentUser, supabaseServer } from '@/lib/supabase/server';
import { ago } from '@/lib/leads';
import { signOut } from '../../(auth)/actions';

export const metadata = { title: 'Settings · Lead Desk' };
export const dynamic = 'force-dynamic';

export default async function Settings() {
  const [company, user, sb] = await Promise.all([activeCompany(), currentUser(), supabaseServer()]);
  const { data: sources } = await sb.from('sheet_sources')
    .select('id, label, tab_title, last_synced_at, last_error').eq('company_id', company!.id).order('created_at');
  const owner = company!.role === 'owner';
  return (
    <>
      <div className="hd"><div className="grow h1">Settings</div></div>
      <div className="card">
        <div><span className="lbl">Company</span><b>{company!.name}</b> <span className="sub">· you are {owner ? 'the owner' : 'a caller'}</span></div>
        <div><span className="lbl">Signed in as</span><b>{user?.email}</b></div>
      </div>

      <div className="card" style={{ marginTop: 10 }}>
        <span className="lbl" style={{ margin: 0 }}>Connected sheets</span>
        {sources?.length ? sources.map(s => (
          <div key={s.id}>
            <b>{s.label || 'Google Sheet'}</b> <span className="sub">· tab “{s.tab_title}”</span>
            <p className="sub">{s.last_synced_at ? `Last checked ${ago(s.last_synced_at)}` : 'Not synced yet'}</p>
            {s.last_error && <p className="err" style={{ marginTop: 6 }}>{s.last_error}</p>}
          </div>
        )) : <p className="sub">No sheet connected yet.</p>}
        {owner && <Link className="btn light" href="/onboarding/sheet">{sources?.length ? 'Connect another sheet' : 'Connect a sheet'}</Link>}
      </div>

      <form action={signOut} style={{ marginTop: 10 }}><button className="btn light">Sign out</button></form>
    </>
  );
}
