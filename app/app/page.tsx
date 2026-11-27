import Link from 'next/link';
import { activeCompany } from '@/lib/company';
import { loadCtx, loadLeads, LEAD_LIMIT } from '@/lib/loadLeads';
import LeadsView from './LeadsView';

export const metadata = { title: 'Leads · Lead Desk' };
export const dynamic = 'force-dynamic';

export default async function Leads() {
  const company = (await activeCompany())!;
  const [{ ctx, sources }, leads] = await Promise.all([loadCtx(company), loadLeads(company.id)]);

  const header = (
    <div className="hd">
      <div className="grow"><div className="lbl">Company</div><div className="h1">{company.name}</div></div>
    </div>
  );

  if (!sources.length) {
    return (
      <>
        {header}
        <div className="empty">
          <b>Connect your Google Sheet</b>
          {company.role === 'owner'
            ? <><p className="sub">Your leads show up here once the sheet your Meta ads fill is connected.</p><Link className="btn" href="/onboarding/sheet">Connect a sheet</Link></>
            : <p className="sub">Ask your company owner to connect the leads sheet.</p>}
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      <LeadsView initial={leads} ctx={ctx} syncError={sources.find(s => s.last_error)?.last_error || ''} truncated={leads.length >= LEAD_LIMIT} />
    </>
  );
}
