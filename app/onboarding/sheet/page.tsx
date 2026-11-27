import { redirect } from 'next/navigation';
import { activeCompany } from '@/lib/company';
import { robotEmail } from '@/lib/google/sheets';
import { googleReady } from '@/lib/google/oauth';
import { getPending } from '@/lib/google/pending';
import ConnectSheet from './ConnectSheet';

export const metadata = { title: 'Connect your Google Sheet · Lead Desk' };
export const dynamic = 'force-dynamic';

export default async function SheetStep({ searchParams }: { searchParams: Promise<{ via?: string; gerr?: string }> }) {
  const company = await activeCompany();
  if (!company) redirect('/onboarding');
  if (company.role !== 'owner') redirect('/app');
  const { via, gerr } = await searchParams;
  const googleConnected = via === 'google' && !!(await getPending());
  return (
    <main className="col">
      <ConnectSheet robot={robotEmail()} company={company.name} googleEnabled={googleReady()} googleConnected={googleConnected} googleError={gerr || ''} />
    </main>
  );
}
