import { Brand } from '@/app/Icons';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { currentUser } from '@/lib/supabase/server';
import { signOut } from '../../(auth)/actions';
import JoinButton from './JoinButton';

export const metadata = { title: 'Join your team · Leadio' };
export const dynamic = 'force-dynamic';

type Row = { email: string; role: string; accepted_at: string | null; expires_at: string; companies: { name: string } | null };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = /^[0-9a-f]{48}$/.test(token);
  // The token is the secret, so the invite is looked up with the service role (signed-out visitors have no table access).
  const { data: inv } = valid
    ? await supabaseAdmin().from('invites').select('email, role, accepted_at, expires_at, companies(name)').eq('token', token).maybeSingle<Row>()
    : { data: null };
  const user = await currentUser();
  const here = `/invite/${token}`;

  const shell = (body: React.ReactNode) => (
    <main className="col center">
      <div className="card" style={{ width: '100%' }}>
        <Brand />
        {body}
      </div>
    </main>
  );

  if (!inv || inv.accepted_at || new Date(inv.expires_at) < new Date()) {
    return shell(<>
      <h1>This invite link doesn’t work</h1>
      <p className="sub">It may have expired (links last 7 days), been used already, or been cancelled. Ask your team owner for a new link.</p>
      <Link className="btn light" href={user ? '/app' : '/login'}>{user ? 'Open Leadio' : 'Log in'}</Link>
    </>);
  }

  const company = inv.companies?.name || 'a team';
  const intro = <>
    <h1>Join {company}</h1>
    <p className="sub">You’ve been invited as {inv.role === 'owner' ? 'an owner' : 'a caller'} to work on {company}’s leads in Leadio.</p>
  </>;

  if (!user) {
    return shell(<>
      {intro}
      <p className="sub">This invite is for <b style={{ color: 'var(--ink)' }}>{inv.email}</b>. Create your account with that email, or log in if you already have one.</p>
      <Link className="btn" href={`/signup?email=${encodeURIComponent(inv.email)}&next=${encodeURIComponent(here)}`}>Create account</Link>
      <Link className="btn light" href={`/login?next=${encodeURIComponent(here)}`}>I already have an account</Link>
    </>);
  }

  if ((user.email || '').toLowerCase() !== inv.email) {
    return shell(<>
      {intro}
      <p className="err">This invite is for <b>{inv.email}</b>, but you’re logged in as <b>{user.email}</b>.</p>
      <form action={signOut}><button className="btn light">Log out and switch account</button></form>
    </>);
  }

  return shell(<>
    {intro}
    <JoinButton token={token} company={company} />
  </>);
}
