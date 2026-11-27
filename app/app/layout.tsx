import { redirect } from 'next/navigation';
import { activeCompany } from '@/lib/company';
import Nav from './Nav';

// Everything under /app needs a signed-in user (middleware) who belongs to a company (here).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const company = await activeCompany();
  if (!company) redirect('/onboarding');
  return (
    <div className="col app">
      {children}
      <Nav />
    </div>
  );
}
