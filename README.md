# Leadio

Call and WhatsApp your Meta ad leads from your phone. Companies sign up, connect the Google Sheet their Meta ads fill, choose what shows on each lead card, and their team works through leads with Call, WhatsApp, statuses, follow-ups and stats.

Built with Next.js on Vercel, Supabase (accounts + database) and the Google Sheets API. The plan and milestones are in [docs/v3-plan.md](docs/v3-plan.md).

## One-time setup

### 1. Supabase (accounts and database)
1. Create a free project at https://supabase.com (region close to your users, e.g. Mumbai).
2. **SQL Editor → New query**: paste all of `supabase/migrations/0001_init.sql` and click **Run**. Then do the same with each later file in `supabase/migrations/` (`0002_grants.sql`, …), in order.
3. **Authentication → Sign In / Providers → Email**: keep **Confirm email** on.
4. **Authentication → URL Configuration**:
   - **Site URL**: your Vercel URL, e.g. `https://leadio.vercel.app`
   - **Redirect URLs**: add `https://leadio.vercel.app/**` and `http://localhost:3000/**`
5. **Project Settings → API**: you'll need the **Project URL**, the **anon public** key and the **service_role** key (secret).

Supabase's built-in email sender is for testing only (a few emails per hour). Before launch, set up a custom SMTP sender (Resend) under **Authentication → Emails → SMTP** (milestone 6).

### 2. Vercel environment variables
Vercel → project → **Settings → Environment Variables** (Production and Preview):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key (secret) |
| `NEXT_PUBLIC_SITE_URL` | Your app URL, e.g. `https://leadio.vercel.app` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | (milestone 2) the whole JSON key of the Google service account |

Then redeploy.

### 3. Local development
```bash
npm install
cp .env.example .env.local   # fill in the Supabase values
npm run dev                  # http://localhost:3000
npm test                     # unit tests
```

## Shipping changes
Work on a branch (Vercel gives it a preview URL). When it's checked, merge to `main`; Vercel builds and goes live. Before merging run `npm test`, `npm run typecheck` and `npm run build`.

## Working with Claude Code
Open this folder in Claude Code. `CLAUDE.md` gives Claude the full context. `/deploy` checks and ships a change.
