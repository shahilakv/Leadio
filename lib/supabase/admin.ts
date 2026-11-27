import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Service-role client: bypasses RLS. Server only, and only for jobs a user can't do themselves
// (sync inserting leads, reading encrypted tokens, sending invites). Always scope queries by company_id.
export function supabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Server setup missing: SUPABASE_SERVICE_ROLE_KEY');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
