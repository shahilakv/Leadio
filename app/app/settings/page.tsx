import Link from 'next/link';
import { activeCompany, myCompanies } from '@/lib/company';
import { currentUser, supabaseServer } from '@/lib/supabase/server';
import { loadTeam, loadInvites } from '@/lib/team';
import { siteUrl } from '@/lib/site';
import { robotEmail } from '@/lib/google/sheets';
import { signOut } from '../../(auth)/actions';
import SheetsPanel, { type SheetRow } from './SheetsPanel';
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
    sb.from('sheet_sources').select('id, label, tab_title, connection, status_column, last_synced_at, last_error').eq('company_id', c.id).order('created_at'),
    loadTeam(c.id),
    owner ? loadInvites(c.id) : Promise.resolve([]),
  ]);
  const sheetRows: SheetRow[] = await Promise.all((sources ?? []).map(async s => {
    const { count } = await sb.from('leads').select('id', { count: 'exact', head: true }).eq('source_id', s.id);
    return { ...s, leads: count ?? 0 } as SheetRow;
  }));

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

      <SheetsPanel sources={sheetRows} owner={owner} robot={robotEmail()} />

      <div className="card" style={{ marginTop: 10 }}>
        <Link className="btn light" href="/onboarding?new=1">Create another company</Link>
        <form action={signOut}><button className="btn light">Sign out</button></form>
      </div>
    </>
  );
}
