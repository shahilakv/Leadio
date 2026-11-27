# Lead Desk

A phone-first web app for calling and messaging Meta (Facebook/Instagram) ad leads, built by BBB Integrated. **v3 is a multi-company SaaS:** a user signs up (email verification), creates a company, connects the Google Sheet their Meta ads fill, picks which columns show on the lead card, and the team calls leads from cards with Call, WhatsApp and a status. The first company is **Ibna** (rental apartments).

The full build plan with milestones is in `docs/v3-plan.md`. Milestones 1 (foundation), 2 (connect a sheet by URL, field picker, sync, lead cards), 3 (calling workflow: statuses, after-call sheet, notes/history, lead detail, follow-ups, stats, company settings) and 4 (team: invite links, roles, remove member, "called by", company switcher) are done. Next: 5 (Connect Google + background sync).

## Stack

- **Next.js 15** (App Router, TypeScript) on **Vercel**. `git push` to `main` goes live; other branches get preview URLs.
- **Supabase**: Auth (email + password, email confirmation, reset) and Postgres. The schema is in `supabase/migrations/` (apply it with the Supabase SQL editor or `supabase db push`).
- **Google Sheets** is read-only input. Leads are synced into Postgres. Call results (status, notes, follow-ups) live **only in the database**, never in the sheet.
- Tests: **Vitest** (`tests/*.test.ts`) for pure logic.

## Commands

| Task | Command |
|---|---|
| Install | `npm install` |
| Dev server | `npm run dev` → http://localhost:3000 (needs `.env.local`, see `.env.example`) |
| Unit tests | `npm test` |
| Type-check | `npm run typecheck` |
| Production build | `npm run build` |

## Layout

- `app/(auth)/`: signup, login, verify, forgot-password, update-password, plus `actions.ts` (server actions) and `AuthForm.tsx`.
- `app/auth/confirm/route.ts`: landing page for Supabase email links (`?code=` or `?token_hash=&type=`).
- `app/onboarding/`: create a company (RPC `create_company`).
- `app/app/`: the signed-in app (Leads, Follow-ups, Stats, Settings). `layout.tsx` sends users with no company to onboarding.
- `middleware.ts`: refreshes the Supabase session; `/app` and `/onboarding` need sign-in.
- `lib/supabase/{client,server,admin}.ts`: browser client, server client (acts as the user, RLS applies), service-role client (server only, bypasses RLS).
- `lib/company.ts`: `myCompanies()`, `activeCompany()` (cookie `ld_company`).
- `lib/leads.ts`: `STATUSES` and groups, `guessFieldMap()`, phone helpers, `waText()`, date helpers.
- `app/onboarding/sheet/`: connect a sheet by URL (`checkSheet` → `inspectTab` → field-picker pop-up → `connectSheet`). Owner only.
- `app/app/LeadsView.tsx`: tiles, chips, search, lead cards (Call / WhatsApp). Calls `POST /api/sync` on open and every 60s.
- `app/app/actions.ts`: `updateLead`, `logCall`, `addNote`, `logWhatsApp`, `updateCompany` (server actions as the user; RLS + column grants apply). Every call/status/note/WhatsApp tap adds a `lead_activity` row.
- `app/app/useLeads.ts`: optimistic lead state + the call flow (tap Call → dialer → on return, `AfterCall.tsx` asks "How did the call go?"). Used by Leads, Follow-ups and the lead detail page. `LeadCard.tsx` holds the card, `StatusSelect` and `CallButtons`.
- **Team**: `app/app/settings/TeamPanel.tsx` + `teamActions.ts` (`createInvite`, `cancelInvite`, `removeMember`, `switchCompany`). Invites are **links** (`/invite/<token>`, 7 days) the owner shares by WhatsApp, email or copy. Supabase's admin invite email isn't used: its implicit-flow link doesn't work with server-side auth, and the default sender is rate-limited. `app/invite/[token]` looks the token up with the service role, then `accept_invite()` checks the signed-in email matches.
- `lib/team.ts`: `loadTeam()`, `loadInvites()`. `Ctx.team` maps user id → first name for "last by Shahila".
- `lib/tz.ts`: server "today" in `Asia/Kolkata` (Vercel runs in UTC). Make it per company when non-India companies join.
- `lib/google/sheets.ts`: Sheets API as the robot service account (`GOOGLE_SERVICE_ACCOUNT_JSON`, read-only scope). Companies share their sheet with `robotEmail()` as Viewer.
- `lib/sync.ts`: `syncSource()` upserts sheet rows into `leads` by `(source_id, external_id)`, writing only sheet-derived columns so call results survive. Skips a source synced in the last 45s.
- `lib/sheets/rows.ts`: `rowsToLeads()` (sheet values → leads: skips empty rows, Meta test leads and duplicates; drops Meta bookkeeping columns via `SKIP_COLS`), `parseSheetUrl()`, `col()`.

## Data and security rules

- **Every table has Row Level Security** keyed on membership (`is_member()` / `is_owner()`). New tables must get RLS and policies in a new migration. Never edit an applied migration; add `0002_…sql`.
- Use `supabaseServer()` (user's session) by default. Use `supabaseAdmin()` only for jobs a user can't do (sync inserting leads, encrypted tokens, invites), and always filter by `company_id`.
- **New tables need explicit GRANTs** (see `0002_grants.sql`): this Supabase project doesn't grant API roles access by default ("permission denied for table" = missing grant, not RLS). Grant `authenticated` only the columns it needs; never grant to `anon`.
- Browsers may only update the call columns of `leads` (column grants in `0001_init.sql`). Leads are inserted by server-side sync only.
- `source_secrets` (OAuth tokens) has no policies on purpose: service role only.
- Redirect targets from user input go through `safeNext()` in `lib/site.ts`.
- Never commit `.env*` files (except `.env.example`), service account keys or Supabase service-role keys.

## Statuses (single source of truth: `STATUSES` in `lib/leads.ts`)

New · No answer · Follow-up · Interested · Visit booked · Converted · Not interested · Wrong number
(v1's "Rented" became "Converted" for multi-company use.)

- **Not connected** = New + No answer
- **Interested** tile = Interested + Visit booked
- **Closed** (hidden from follow-ups) = Converted, Not interested, Wrong number
- **Reached** (stats) = Follow-up, Interested, Visit booked, Converted, Not interested

## Design rules

The Figma source is "Lead Desk – Mobile App": https://www.figma.com/design/HcegiYQJr1VZgukFksDolI

- Font: **Plus Jakarta Sans** (500/600/700/800), loaded with `next/font`.
- Colours (tokens in `app/globals.css`): bg `#EDEFF2`, cards `#FFFFFF`, ink `#111114`, muted `#868A94`, soft `#F3F4F6`, **lime `#D7F36B`** = selected/active, pink `#F8DCE5`, lavender `#E4E0FA`, WhatsApp `#1FAF55`.
- Phone first: one column, max width 480px, tap targets ≥ 44px, inputs 16px (stops iOS zoom), rounded cards (24px), pill buttons.
- **Keep it simple.** The owner wants plain, easy-to-understand UI: labelled buttons rather than bare icons, and no extra flows.
- Don't use `alert/confirm/prompt`.

## History

v1 was a Google Apps Script web app and v2 a single-file Vercel app. Both are in git history (before the `v3-saas` branch). The old Apps Script `/exec` link still runs its own copy until it's turned off in Apps Script.

## Roadmap

See `docs/v3-plan.md` (milestones) and `docs/roadmap.md` (product ideas).
