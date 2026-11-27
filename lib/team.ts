import 'server-only';
import { supabaseServer } from '@/lib/supabase/server';

export type Member = { user_id: string; role: 'owner' | 'caller'; name: string; email: string; joined: string };
export type Invite = { id: string; email: string; role: 'owner' | 'caller'; token: string; expires_at: string; created_at: string };

// Team members of a company with their names (RLS: members see each other's profiles).
export async function loadTeam(companyId: string): Promise<Member[]> {
  const sb = await supabaseServer();
  const { data: ms } = await sb.from('memberships').select('user_id, role, created_at').eq('company_id', companyId).order('created_at');
  const ids = (ms ?? []).map(m => m.user_id);
  const { data: ps } = ids.length ? await sb.from('profiles').select('id, full_name, email').in('id', ids) : { data: [] };
  return (ms ?? []).map(m => {
    const p = (ps ?? []).find(x => x.id === m.user_id);
    return { user_id: m.user_id, role: m.role as Member['role'], name: p?.full_name || p?.email || 'Team member', email: p?.email || '', joined: m.created_at };
  });
}

// Pending (not accepted, not expired) invites. RLS: owners only, so callers get [].
export async function loadInvites(companyId: string): Promise<Invite[]> {
  const sb = await supabaseServer();
  const { data } = await sb.from('invites').select('id, email, role, token, expires_at, created_at')
    .eq('company_id', companyId).is('accepted_at', null).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false });
  return (data ?? []) as Invite[];
}

export const firstName = (n: string) => n.split(/[\s@]/)[0] || n;
