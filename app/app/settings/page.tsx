import { activeCompany } from '@/lib/company';
import { currentUser } from '@/lib/supabase/server';
import { signOut } from '../../(auth)/actions';

export const metadata = { title: 'Settings · Lead Desk' };

export default async function Settings() {
  const [company, user] = await Promise.all([activeCompany(), currentUser()]);
  return (
    <>
      <div className="hd"><div className="grow h1">Settings</div></div>
      <div className="card">
        <div><span className="lbl">Company</span><b>{company!.name}</b> <span className="sub">· you are {company!.role === 'owner' ? 'the owner' : 'a caller'}</span></div>
        <div><span className="lbl">Signed in as</span><b>{user?.email}</b></div>
        <form action={signOut}><button className="btn light">Sign out</button></form>
      </div>
    </>
  );
}
