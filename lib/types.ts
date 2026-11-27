import type { FieldMap } from '@/lib/leads';

// Lead columns the app loads (see supabase/migrations/0001_init.sql).
export type Lead = {
  id: string; source_id: string; name: string; phone: string; lead_time: string | null; campaign: string;
  fields: Record<string, string>; status: string; follow_up: string | null; attempts: number;
  first_called_at: string | null; last_called_at: string | null; last_called_by: string | null;
};
export const LEAD_COLS = 'id, source_id, name, phone, lead_time, campaign, fields, status, follow_up, attempts, first_called_at, last_called_at, last_called_by';

export type Source = { id: string; label: string; tab_title: string; field_map: FieldMap; card_fields: string[]; last_synced_at: string | null; last_error: string | null };
export const SOURCE_COLS = 'id, label, tab_title, field_map, card_fields, last_synced_at, last_error';

// What every lead list needs to draw cards and build WhatsApp links.
export type Ctx = { template: string; countryCode: string; sources: Record<string, Source>; team: Record<string, string> };

export type Activity = { id: string; kind: 'call' | 'whatsapp' | 'status' | 'note'; status: string | null; body: string; created_at: string; user_id: string };
