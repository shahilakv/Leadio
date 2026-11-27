import Link from 'next/link';
import { activeCompany, myCompanies } from '@/lib/company';
import { currentUser, supabaseServer } from '@/lib/supabase/server';
import { loadTeam, loadInvites } from '@/lib/team';
import { siteUrl } from '@/lib/site';
import { ago } from '@/lib/leads';
import { signOut } from '../../(auth)/actions';
import { switchCompany } from './teamActions';
import CompanyForm from './CompanyForm';
import TeamPanel from './TeamPanel';

export const metadata = { title: 'Settings · Lead Desk' };
export const dynamic = 'force-dynamic';

export default async function Settings() {
  const [company, user, sb, companies] = await Promise.all([activeCompany(), currentUser(), supabaseServer(), myCompanies()]);
  const c = company!;
  const owner = c.role === 'owner';
  const [{ data: sources }, members, invites] = await Promise.all([
    sb.from('sheet_sources').select('id, label, tab_title, last_synced_at, last_error').eq('company_id', c.id).order('created_at'),
    loadTeam(c.id),
    owner ? loadInvites(c.id) : Promise.resolve([]),
  ]);

  return (
    <>
      <div className="hd"><div className="grow h1">Settings</div></div>
      <div className="card">
        <div><span className="lbl">Company</span><b>{c.name}</b> <span className="sub">· you are {owner ? 'an owner' : 'a caller'}</span></div>
        <div><span className="lbl">Signed in as</span><b>{user?.email}</b></div>
        {companies.length > 1 && (
          <div>
            <span className="lbl">Switch company</span>
            <div className="chips wrap">
              {companies.map(x => (
                <form key={x.id} action={switchCompany.bind(null, x.id)}>
                  <button className={'chip' + (x.id === c.id ? ' on' : '')} disabled={x.id === c.id}>{x.name}</button>
                </form>
              ))}
            </div>
          </div>
        )}
      </div>

      <CompanyForm name={c.name} template={c.whatsapp_template} countryCode={c.country_code} owner={owner} />

      <TeamPanel members={members} invites={invites} me={user!.id} owner={owner} company={c.name} site={siteUrl()} />

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

      <div className="card" style={{ marginTop: 10 }}>
        <Link className="btn light" href="/onboarding?new=1">Create another company</Link>
        <form action={signOut}><button className="btn light">Sign out</button></form>
      </div>
    </>
  );
}
