import Link from 'next/link';
import { activeCompany } from '@/lib/company';
import { supabaseServer } from '@/lib/supabase/server';
import LeadsView, { type Lead, type Source } from './LeadsView';

export const metadata = { title: 'Leads · Lead Desk' };
export const dynamic = 'force-dynamic';

const LIMIT = 3000;

export default async function Leads() {
  const company = (await activeCompany())!;
  const sb = await supabaseServer();
  const [{ data: sources }, { data: leads }] = await Promise.all([
    sb.from('sheet_sources').select('id, label, tab_title, field_map, card_fields, last_synced_at, last_error').eq('company_id', company.id).order('created_at'),
    sb.from('leads')
      .select('id, source_id, name, phone, lead_time, campaign, fields, status, follow_up, attempts, last_called_at')
      .eq('company_id', company.id)
      .order('lead_time', { ascending: false, nullsFirst: false })
      .limit(LIMIT),
  ]);

  const header = (
    <div className="hd">
      <div className="grow"><div className="lbl">Company</div><div className="h1">{company.name}</div></div>
    </div>
  );

  if (!sources?.length) {
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
      <LeadsView
        leads={(leads ?? []) as Lead[]}
        sources={sources as Source[]}
        template={company.whatsapp_template}
        countryCode={company.country_code}
        truncated={(leads?.length ?? 0) >= LIMIT}
      />
    </>
  );
}
