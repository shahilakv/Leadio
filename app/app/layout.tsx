import { redirect } from 'next/navigation';
import { activeCompany } from '@/lib/company';
import { supabaseServer } from '@/lib/supabase/server';
import { FOLLOW_STATUSES } from '@/lib/leads';
import { todayIn } from '@/lib/tz';
import Nav from './Nav';

// Everything under /app needs a signed-in user (middleware) who belongs to a company (here).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const company = await activeCompany();
  if (!company) redirect('/onboarding');
  const sb = await supabaseServer();
  // Red badge on Follow-ups: No answer / Follow-up leads due today or overdue.
  const { count } = await sb.from('leads').select('id', { count: 'exact', head: true })
    .eq('company_id', company.id).lte('follow_up', todayIn()).in('status', FOLLOW_STATUSES);
  return (
    <div className="col app">
      {children}
      <Nav due={count ?? 0} />
    </div>
  );
}
