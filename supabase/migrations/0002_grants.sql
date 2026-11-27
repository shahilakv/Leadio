-- Table privileges. Newer Supabase projects don't grant the API roles access to new tables by default,
-- so each role gets exactly what the app needs. Row Level Security (0001) still filters every row.
-- anon (signed-out visitors) gets nothing.

-- Server-side jobs (sync, invites) use the service role.
grant usage on schema public to authenticated, service_role;
grant all on all tables in schema public to service_role;

-- Signed-in users
grant select on public.profiles, public.companies, public.memberships, public.invites,
                public.sheet_sources, public.leads, public.lead_activity to authenticated;

grant update (full_name) on public.profiles to authenticated;
grant update (name, whatsapp_template, country_code) on public.companies to authenticated;
grant delete on public.memberships to authenticated;
grant insert (company_id, email, role, invited_by), delete on public.invites to authenticated;
grant insert (company_id, label, spreadsheet_id, tab_title, connection, oauth_owner, field_map, card_fields),
      update (label, tab_title, field_map, card_fields), delete on public.sheet_sources to authenticated;
-- leads: column-level update grant is in 0001 (status, follow_up, attempts, first/last called).
grant insert (lead_id, company_id, user_id, kind, status, body) on public.lead_activity to authenticated;

-- source_secrets: service role only (no grant to authenticated on purpose).
revoke all on public.source_secrets from authenticated, anon;
