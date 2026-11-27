-- Lead Desk v3: multi-company schema.
-- Rule: every table has Row Level Security. Browser code uses the anon key + the user's session,
-- so these policies are what keep one company's leads away from another.
-- Writes the browser must not do (lead inserts from sync, secrets) go through the service role on the server.

create extension if not exists pgcrypto;

-- ---------- profiles (name shown for "called by") ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- companies and membership ----------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  whatsapp_template text not null default 'Hi {name}, thanks for your enquiry. Is this a good time to talk?',
  country_code text not null default '91' check (country_code ~ '^[0-9]{1,4}$'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.memberships (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'caller')),
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);
create index memberships_user_idx on public.memberships(user_id);

-- Security-definer helpers so policies don't recurse into memberships' own RLS.
create or replace function public.is_member(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships where company_id = c and user_id = auth.uid());
$$;
create or replace function public.is_owner(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships where company_id = c and user_id = auth.uid() and role = 'owner');
$$;

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null check (email = lower(email)),
  role text not null default 'caller' check (role in ('owner', 'caller')),
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by uuid not null references auth.users(id),
  accepted_at timestamptz,
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now()
);

-- ---------- sheets ----------
create table public.sheet_sources (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  label text not null default '',
  spreadsheet_id text not null,
  tab_title text not null,
  connection text not null check (connection in ('service_account', 'oauth')),
  oauth_owner uuid references auth.users(id),
  field_map jsonb not null default '{}'::jsonb,      -- {"name":"full_name","phone":"phone_number",...}
  card_fields text[] not null default '{}',           -- sheet headers shown on the lead card
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);
create index sheet_sources_company_idx on public.sheet_sources(company_id);

-- OAuth refresh tokens, encrypted by the app. No policies: only the service role can read it.
create table public.source_secrets (
  source_id uuid primary key references public.sheet_sources(id) on delete cascade,
  token_enc text not null,
  updated_at timestamptz not null default now()
);

-- ---------- leads ----------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  source_id uuid not null references public.sheet_sources(id) on delete cascade,
  external_id text not null,              -- Meta lead id, or a hash of the row when there is none
  sheet_row int,
  name text not null default '',
  phone text not null default '',
  lead_time timestamptz,
  campaign text not null default '',
  fields jsonb not null default '{}'::jsonb,   -- the mapped sheet values (header -> value)
  status text not null default 'New',
  follow_up date,
  attempts int not null default 0,
  first_called_at timestamptz,
  last_called_at timestamptz,
  last_called_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, external_id)
);
create index leads_company_time_idx on public.leads(company_id, lead_time desc);
create index leads_company_status_idx on public.leads(company_id, status);
create index leads_company_follow_idx on public.leads(company_id, follow_up);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger leads_touch before update on public.leads for each row execute function public.touch_updated_at();

create table public.lead_activity (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  kind text not null check (kind in ('call', 'whatsapp', 'status', 'note')),
  status text,
  body text not null default '' check (char_length(body) <= 4000),
  created_at timestamptz not null default now()
);
create index lead_activity_lead_idx on public.lead_activity(lead_id, created_at desc);
create index lead_activity_company_idx on public.lead_activity(company_id, created_at desc);

-- ---------- Row Level Security ----------
alter table public.profiles       enable row level security;
alter table public.companies      enable row level security;
alter table public.memberships    enable row level security;
alter table public.invites        enable row level security;
alter table public.sheet_sources  enable row level security;
alter table public.source_secrets enable row level security;
alter table public.leads          enable row level security;
alter table public.lead_activity  enable row level security;

-- profiles: yourself, and people who share a company with you
create policy profiles_select on public.profiles for select using (
  id = auth.uid() or exists (
    select 1 from public.memberships a join public.memberships b on a.company_id = b.company_id
    where a.user_id = auth.uid() and b.user_id = profiles.id));
create policy profiles_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- companies: members read, owners edit. Created only through create_company().
create policy companies_select on public.companies for select using (public.is_member(id));
create policy companies_update on public.companies for update using (public.is_owner(id)) with check (public.is_owner(id));

-- memberships: members see their team; owners remove people (not themselves)
create policy memberships_select on public.memberships for select using (public.is_member(company_id));
create policy memberships_delete on public.memberships for delete using (public.is_owner(company_id) and user_id <> auth.uid());

-- invites: owners only
create policy invites_select on public.invites for select using (public.is_owner(company_id));
create policy invites_insert on public.invites for insert with check (public.is_owner(company_id) and invited_by = auth.uid());
create policy invites_delete on public.invites for delete using (public.is_owner(company_id));

-- sheet sources: members read, owners manage
create policy sources_select on public.sheet_sources for select using (public.is_member(company_id));
create policy sources_insert on public.sheet_sources for insert with check (public.is_owner(company_id));
create policy sources_update on public.sheet_sources for update using (public.is_owner(company_id)) with check (public.is_owner(company_id));
create policy sources_delete on public.sheet_sources for delete using (public.is_owner(company_id));

-- leads: members read and update the call columns; inserts come from server-side sync
create policy leads_select on public.leads for select using (public.is_member(company_id));
create policy leads_update on public.leads for update using (public.is_member(company_id)) with check (public.is_member(company_id));
revoke update on public.leads from authenticated, anon;
grant update (status, follow_up, attempts, first_called_at, last_called_at, last_called_by) on public.leads to authenticated;

-- activity: members read; you can only add entries as yourself, for a lead in your company
create policy activity_select on public.lead_activity for select using (public.is_member(company_id));
create policy activity_insert on public.lead_activity for insert with check (
  user_id = auth.uid() and public.is_member(company_id)
  and exists (select 1 from public.leads l where l.id = lead_id and l.company_id = lead_activity.company_id));

-- ---------- functions the app calls ----------
-- Create a company and make the caller its owner, in one step.
create or replace function public.create_company(company_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if char_length(trim(company_name)) = 0 then raise exception 'Company name is required'; end if;
  insert into companies (name, created_by) values (trim(company_name), auth.uid()) returning id into cid;
  insert into memberships (company_id, user_id, role) values (cid, auth.uid(), 'owner');
  return cid;
end $$;

-- Join a company with an invite token. The signed-in email must match the invite.
create or replace function public.accept_invite(invite_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv invites;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into inv from invites where token = invite_token;
  if inv.id is null or inv.accepted_at is not null or inv.expires_at < now() then
    raise exception 'This invite link is invalid or has expired';
  end if;
  if lower(coalesce(auth.jwt()->>'email', '')) <> inv.email then
    raise exception 'This invite was sent to a different email address';
  end if;
  insert into memberships (company_id, user_id, role) values (inv.company_id, auth.uid(), inv.role)
    on conflict (company_id, user_id) do nothing;
  update invites set accepted_at = now() where id = inv.id;
  return inv.company_id;
end $$;

revoke all on function public.create_company(text) from public, anon;
revoke all on function public.accept_invite(text) from public, anon;
grant execute on function public.create_company(text) to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
