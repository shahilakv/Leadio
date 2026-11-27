-- Background sync: every minute, Supabase calls Lead Desk's /api/cron/sync, so new sheet rows
-- arrive even when nobody has the app open. Run this ONCE in Supabase → SQL Editor.
-- (Not a migration: it holds your app's URL and creates a secret.)
--
-- Before running: Database → Extensions → enable "pg_cron" and "pg_net".
-- If your app URL isn't https://leadio-one.vercel.app, change it below.

-- 1. Create the shared secret inside Supabase's Vault (only if it doesn't exist yet).
select vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'lead_desk_cron_secret')
where not exists (select 1 from vault.secrets where name = 'lead_desk_cron_secret');

-- 2. Schedule the call (re-running this replaces the old schedule).
select cron.unschedule('lead-desk-sync') where exists (select 1 from cron.job where jobname = 'lead-desk-sync');
select cron.schedule(
  'lead-desk-sync',
  -- Every minute: pg_net sometimes hits "Error in the HTTP2 framing layer" when it reuses a
  -- connection Vercel already closed, so roughly every other call fails. Every minute keeps
  -- the connection warm and still gives a successful sync at least every 2 minutes.
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://leadio-one.vercel.app/api/cron/sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'lead_desk_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

-- 3. Show the secret ONCE so you can paste it into Vercel as CRON_SECRET. Don't share it.
select decrypted_secret as "Copy this into Vercel as CRON_SECRET"
from vault.decrypted_secrets where name = 'lead_desk_cron_secret';

-- Later, to check it's running:
--   select status, return_message, start_time from cron.job_run_details order by start_time desc limit 5;
--   select status_code, content from net._http_response order by created desc limit 5;
