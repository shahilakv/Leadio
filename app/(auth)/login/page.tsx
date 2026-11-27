import Link from 'next/link';
import AuthForm from '../AuthForm';
import { logIn } from '../actions';

export const metadata = { title: 'Log in · Lead Desk' };

export default async function LogIn({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next = '/app', error } = await searchParams;
  return (
    <main className="col center">
      <div className="card" style={{ width: '100%' }}>
        <div className="brand"><i>☎</i>Lead Desk</div>
        <h1>Log in</h1>
        {error && <p className="err" role="alert">{error}</p>}
        <AuthForm action={logIn} submit="Log in" fields={[
          { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
          { name: 'password', label: 'Password', type: 'password', autoComplete: 'current-password' },
          { name: 'next', label: '', hidden: true, defaultValue: next },
        ]} />
        <p className="row"><Link className="link" href="/forgot-password">Forgot password?</Link><Link className="link" href={`/signup?next=${encodeURIComponent(next)}`}>Create account</Link></p>
      </div>
    </main>
  );
}
