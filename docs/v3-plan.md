# Lead Desk v3 — multi-company SaaS on Vercel

## Context
Lead Desk today is a single-company app: one Google Sheet, one owner, a single-file HTML frontend
(`src/Index.html`) and a small Vercel API (`api/`) that is not yet live. The owner now wants it to be a
product many companies sign up for:

1. A user signs up with email + password and verifies their email.
2. They enter their company name, then connect a Google Sheet ("Connect Google" pop-up **or** paste the sheet URL).
3. A pop-up shows the sheet's columns; they pick which fields appear on the lead card (name and phone required).
4. Leads are fetched and new rows keep arriving automatically (within ~1 minute).
5. The owner invites teammates (callers) by email; everyone in a company shares its leads.

Decisions already made: **Next.js + Supabase**, both sheet-connection options, owner-invites-team,
~1-minute freshness, **call results stored in the app database only** (the sheet is read-only input),
**no billing yet**.

## Architecture
- **Next.js 15 (App Router, TypeScript)** on Vercel, replacing the current `src/` + `api/` code.
  The existing UI is ported screen by screen as React components with the same design
  (Plus Jakarta Sans, colours, 480px phone column, cards, tiles, after-call sheet).
- **Supabase**: Auth (email + password, email confirmation, password reset, invites) and Postgres.
  Every table has **Row Level Security** keyed on company membership, so a company can never read
  another company's leads, even if app code has a bug.
- **Google Sheets** read via the Sheets API, using one of two connection types:
  - `service_account`: the company shares its sheet with our robot email (the existing
    `leadio@leadio-516007.iam.gserviceaccount.com`) and pastes the URL.
  - `oauth`: "Connect Google" uses the `drive.file` scope with the Google Picker, so the app only gets the
    file the user picks. `drive.file` is a non-sensitive scope, so Google only does a light brand review.
    The refresh token is stored encrypted (AES-GCM, key in Vercel env).
- **Sync**: `syncSource(sourceId)` reads the tab, skips empty and Meta test rows (reusing today's
  `SKIP_COLS` / `TEST_LEAD` rules from `api/_lib/sheets.js`), and upserts leads by Meta `id`
  (falling back to a row hash). It's triggered (a) when the app opens and every 60s while it's open
  (debounced per source), and (b) every 2 minutes by **Supabase pg_cron → `/api/cron/sync`**,
  protected by a secret. This works on Vercel's free plan.

## Data model (Supabase migration `supabase/migrations/0001_init.sql`)
- `companies(id, name, whatsapp_template, country_code default '91', created_by, created_at)`
- `memberships(company_id, user_id, role 'owner'|'caller', unique(company_id,user_id))`
- `invites(id, company_id, email, role, token, invited_by, accepted_at, expires_at)`
- `sheet_sources(id, company_id, label, spreadsheet_id, tab_title, connection 'service_account'|'oauth',
  oauth_owner, oauth_token_enc, field_map jsonb, card_fields text[], last_synced_at, last_error)`
- `leads(id, company_id, source_id, external_id, sheet_row, name, phone, lead_time, campaign,
  fields jsonb, status default 'New', follow_up date, attempts int, first_called_at, last_called_at,
  last_called_by, created_at, updated_at, unique(source_id, external_id))`
- `lead_activity(id, lead_id, company_id, user_id, kind 'call'|'whatsapp'|'status'|'note', status, body, created_at)`.
  Notes and call history live here, which gives the team "who called" for free.
- RLS helper `is_member(company_id)`, and `is_owner(company_id)` for settings, sources and invites.

## Screens / routes (`app/`)
- `/signup`, `/login`, `/verify` (check your email), `/reset-password`, `/auth/callback`
- `/onboarding`: company name → connect a sheet (two big buttons) → pick tab → **field-mapping
  pop-up** (columns with sample values, auto-guessed with today's `detect()` regexes; name and phone
  required; ticks for "show on card") → first sync → leads screen
- `/app` (Leads), `/app/follow-ups`, `/app/stats`, `/app/lead/[id]`: ported from `src/Index.html`
  (tiles, chips, search, Call next, after-call sheet on return from the dialer, WhatsApp template, mic fallback)
- `/app/settings`: company name, WhatsApp message, country code, sheets (add, re-map, remove,
  "Sync now", last sync status), team (invite by email, roles, remove)
- `/invite/[token]`: accept an invite (sign up or log in, then join the company)
- `/privacy`, `/terms`: required for Google's OAuth brand review
- Route handlers: `app/api/sync/route.ts`, `app/api/cron/sync/route.ts`, `app/api/google/oauth/*`,
  `app/api/sheets/inspect/route.ts` (headers + sample rows for the mapping pop-up)

## Code to reuse from today
- `api/_lib/sheets.js`: `SKIP_COLS`, test-lead skip, column-letter helper `col()`, and its test style → `lib/sheets/`
- `src/Index.html`: `STATUSES`, the group arrays, `detect()` regexes, `cleanPhone`/`fmtPhone`,
  `waLink`, date helpers (`pd`, `ago`, `fmtDT`, `fmtDay`), the stats calculations, all CSS tokens → `lib/leads.ts` + `app/globals.css`
- `tests/api.spec.js` fake-Sheets approach → unit tests for sync

## Milestones (each ends deployable)
1. **Foundation**: Next.js scaffold, Supabase client/server helpers, schema + RLS, sign-up with
   email verification, login, reset, onboarding step 1 (company), protected `/app` shell.
2. **Sheets (paste URL)**: share instructions with the robot email, tab picker, field-mapping pop-up,
   sync engine, leads list with cards. Ibna's sheet becomes the first company, already shared.
3. **Calling workflow**: port statuses, after-call sheet, lead detail, notes and activity,
   follow-ups, stats, WhatsApp template per company.
4. **Team**: invites, roles (owner/caller), "called by" on cards, remove member.
5. **Connect Google + auto-sync**: OAuth with `drive.file`, Picker, encrypted tokens, pg_cron every
   2 minutes, privacy/terms pages, submission for Google brand review.
6. **Launch hardening**: custom email sender (Resend + your domain; Supabase's built-in email is
   limited to a few per hour), rate limits on auth and sync, error monitoring, custom domain, docs.

## Things only you can do (I'll guide each one when we get there)
- Create a **Supabase** project (free tier) and set the Supabase URL and keys in Vercel env.
  Secret keys go only into Vercel; you paste them yourself.
- Google Cloud (project "Leadio" already exists): service account key into Vercel env; later the
  OAuth client + Picker API key; the brand review submission.
- **Resend** account + DNS records on your domain (milestone 6), and a domain name for the app.
- Approve each deploy (`git push` to `main` goes live).

## Removed / changed
- `src/Index.html`, `api/`, `scripts/build.mjs`, `scripts/preview.mjs`, the current Playwright demo tests →
  replaced by the Next.js app and new tests. Git history keeps the old versions.
- Call results no longer go into the sheet (decision above). The old `/exec` Apps Script link keeps
  running its own copy until you turn it off.
- `CLAUDE.md`, `README.md`, `.claude/commands/*` rewritten for the new stack (the "keep it plain HTML,
  no framework" rule is retired by this decision).

## Verification
- **Unit (Vitest)**: field auto-mapping, phone cleaning, sync upsert/skip rules against a fake Sheets
  API, encryption round-trip, stats maths.
- **RLS tests**: SQL tests that a member of company A cannot select or update company B rows.
- **E2E (Playwright)**, against a separate Supabase *test* project: sign up → confirm email (via
  Supabase admin API in the test) → create company → paste the URL of a test sheet → map fields →
  see leads → log a call → invite a caller → the caller sees the same lead.
- **Manual on Vercel preview** before each push to `main`: Ibna's real sheet syncs 141 leads; a new row
  added to the sheet appears within ~2 minutes; a second test company sees none of Ibna's data.
