import { activeCompany } from '@/lib/company';

export const metadata = { title: 'Leads · Lead Desk' };

// Milestone 1: the shell. Milestone 2 adds "Connect your Google Sheet" and the lead cards here.
export default async function Leads() {
  const company = (await activeCompany())!;
  return (
    <>
      <div className="hd">
        <div className="grow"><div className="lbl">Company</div><div className="h1">{company.name}</div></div>
      </div>
      <div className="empty">
        <b>Connect your Google Sheet</b>
        <p className="sub">Your leads will show up here once your sheet is connected. This step is coming next.</p>
      </div>
    </>
  );
}
