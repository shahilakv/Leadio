import Link from 'next/link';
import AuthForm from '../AuthForm';
import { signUp } from '../actions';

export const metadata = { title: 'Create account · Lead Desk' };

export default async function SignUp({ searchParams }: { searchParams: Promise<{ next?: string; email?: string }> }) {
  const { next = '/onboarding', email = '' } = await searchParams;
  return (
    <main className="col center">
      <div className="card" style={{ width: '100%' }}>
        <div className="brand"><i>☎</i>Lead Desk</div>
        <h1>Create your account</h1>
        <p className="sub">We’ll email you a link to verify your address.</p>
        <AuthForm action={signUp} submit="Create account" fields={[
          { name: 'name', label: 'Your name', autoComplete: 'name' },
          { name: 'email', label: 'Work email', type: 'email', autoComplete: 'email', defaultValue: email },
          { name: 'password', label: 'Password (8+ characters)', type: 'password', autoComplete: 'new-password' },
          { name: 'next', label: '', hidden: true, defaultValue: next },
        ]} />
        <p className="sub" style={{ fontSize: 12.5 }}>By creating an account you agree to the <Link className="link" href="/terms">terms</Link> and <Link className="link" href="/privacy">privacy policy</Link>.</p>
        <p className="row">Already have an account? <Link className="link" href={`/login?next=${encodeURIComponent(next)}`}>Log in</Link></p>
      </div>
    </main>
  );
}
