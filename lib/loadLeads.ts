import 'server-only';
import { supabaseServer } from '@/lib/supabase/server';
import type { Company } from '@/lib/company';
import { LEAD_COLS, SOURCE_COLS, type Ctx, type Lead, type Source } from '@/lib/types';

export const LEAD_LIMIT = 3000;

// Sources + context for drawing cards. RLS limits everything to the user's company.
export async function loadCtx(company: Company): Promise<{ ctx: Ctx; sources: Source[] }> {
  const sb = await supabaseServer();
  const { data } = await sb.from('sheet_sources').select(SOURCE_COLS).eq('company_id', company.id).order('created_at');
  const sources = (data ?? []) as Source[];
  return { sources, ctx: { template: company.whatsapp_template, countryCode: company.country_code, sources: Object.fromEntries(sources.map(s => [s.id, s])) } };
}

export async function loadLeads(companyId: string): Promise<Lead[]> {
  const sb = await supabaseServer();
  const { data } = await sb.from('leads').select(LEAD_COLS).eq('company_id', companyId)
    .order('lead_time', { ascending: false, nullsFirst: false }).limit(LEAD_LIMIT);
  return (data ?? []) as Lead[];
}
