import { Brand } from '@/app/Icons';
import Link from 'next/link';
import AuthForm from '../AuthForm';
import { requestReset } from '../actions';

export const metadata = { title: 'Reset password · Leadio' };

export default function Forgot() {
  return (
    <main className="col center">
      <div className="card" style={{ width: '100%' }}>
        <Brand />
        <h1>Reset your password</h1>
        <p className="sub">Enter your email and we’ll send you a link to choose a new password.</p>
        <AuthForm action={requestReset} submit="Send reset link" fields={[{ name: 'email', label: 'Email', type: 'email', autoComplete: 'email' }]} />
        <p className="row"><Link className="link" href="/login">Back to log in</Link></p>
      </div>
    </main>
  );
}
