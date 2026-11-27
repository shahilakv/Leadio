import { Brand } from '@/app/Icons';
import { redirect } from 'next/navigation';
import AuthForm from '../AuthForm';
import { updatePassword } from '../actions';
import { currentUser } from '@/lib/supabase/server';

export const metadata = { title: 'New password · Leadio' };

export default async function UpdatePassword() {
  if (!(await currentUser())) redirect('/login?error=' + encodeURIComponent('That reset link has expired. Request a new one.'));
  return (
    <main className="col center">
      <div className="card" style={{ width: '100%' }}>
        <Brand />
        <h1>Choose a new password</h1>
        <AuthForm action={updatePassword} submit="Save password" fields={[{ name: 'password', label: 'New password (8+ characters)', type: 'password', autoComplete: 'new-password' }]} />
      </div>
    </main>
  );
}
