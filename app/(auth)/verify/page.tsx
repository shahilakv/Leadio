import Link from 'next/link';
import AuthForm from '../AuthForm';
import { resendVerification } from '../actions';

export const metadata = { title: 'Check your email · Lead Desk' };

export default async function Verify({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email = '' } = await searchParams;
  return (
    <main className="col center">
      <div className="card" style={{ width: '100%' }}>
        <div className="brand"><i>✉</i>Check your email</div>
        <h1>Verify your email</h1>
        <p className="sub">We sent a link to <b style={{ color: 'var(--ink)' }}>{email || 'your email'}</b>. Open it on this device to finish creating your account.</p>
        <AuthForm action={resendVerification} submit="Send the link again" fields={[{ name: 'email', label: '', hidden: true, defaultValue: email }]} />
        <p className="row">Wrong address? <Link className="link" href="/signup">Start again</Link></p>
      </div>
    </main>
  );
}
