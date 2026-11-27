import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase/server';
import { safeNext } from '@/lib/site';

// Landing page for links in Supabase emails (verify email, reset password, invite).
// Handles both the PKCE "?code=" link and the "?token_hash=&type=" link.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const next = safeNext(p.get('next'));
  const sb = await supabaseServer();
  let error: string | undefined;

  const code = p.get('code'), tokenHash = p.get('token_hash'), type = p.get('type') as EmailOtpType | null;
  if (code) error = (await sb.auth.exchangeCodeForSession(code)).error?.message;
  else if (tokenHash && type) error = (await sb.auth.verifyOtp({ type, token_hash: tokenHash })).error?.message;
  else error = 'This link is incomplete.';

  const url = req.nextUrl.clone();
  url.search = '';
  if (error) {
    url.pathname = '/login';
    url.searchParams.set('error', 'That link has expired or was already used. Log in, or request a new link.');
  } else {
    const [path, query] = next.split('?');
    url.pathname = path;
    if (query) url.search = '?' + query;
  }
  return NextResponse.redirect(url);
}
