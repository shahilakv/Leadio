import { redirect } from 'next/navigation';
import { activeCompany } from '@/lib/company';
import { robotEmail } from '@/lib/google/sheets';
import ConnectSheet from './ConnectSheet';

export const metadata = { title: 'Connect your Google Sheet · Lead Desk' };

export default async function SheetStep() {
  const company = await activeCompany();
  if (!company) redirect('/onboarding');
  if (company.role !== 'owner') redirect('/app');
  return (
    <main className="col">
      <ConnectSheet robot={robotEmail()} company={company.name} />
    </main>
  );
}
