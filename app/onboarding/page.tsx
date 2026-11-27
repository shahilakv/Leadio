import { redirect } from 'next/navigation';
import AuthForm from '../(auth)/AuthForm';
import { createCompany } from './actions';
import { myCompanies } from '@/lib/company';

export const metadata = { title: 'Set up your company · Leadio' };

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const { new: addAnother } = await searchParams;
  if (!addAnother && (await myCompanies()).length) redirect('/app');
  return (
    <main className="col center">
      <div className="card" style={{ width: '100%' }}>
        <p className="lbl">Step 1 of 3</p>
        <h1>What’s your company called?</h1>
        <p className="sub">Your team will see this name. You can change it later in Settings.</p>
        <AuthForm action={createCompany} submit="Continue" fields={[{ name: 'company', label: 'Company name', autoComplete: 'organization' }]} />
      </div>
    </main>
  );
}
