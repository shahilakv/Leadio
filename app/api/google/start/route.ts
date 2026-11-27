import { NextResponse, type NextRequest } from 'next/server';
import { randomBytes } from 'node:crypto';
import { activeCompany } from '@/lib/company';
import { currentUser } from '@/lib/supabase/server';
import { authUrl, googleReady } from '@/lib/google/oauth';
import { STATE_COOKIE, stateCookieOpts } from '@/lib/google/pending';

// GET /api/google/start → Google's consent screen (owners only).
export async function GET(req: NextRequest) {
  const back = (msg: string) => NextResponse.redirect(new URL(`/onboarding/sheet?gerr=${encodeURIComponent(msg)}`, req.url));
  const [company, user] = await Promise.all([activeCompany(), currentUser()]);
  if (!user) return NextResponse.redirect(new URL('/login?next=/onboarding/sheet', req.url));
  if (!company || company.role !== 'owner') return back('Only the company owner can connect Google.');
  if (!googleReady()) return back('“Connect Google” isn’t set up on the server yet. Use “Paste a link” instead.');
  const state = randomBytes(24).toString('hex');
  const res = NextResponse.redirect(authUrl(state, user.email ?? undefined));
  res.cookies.set(STATE_COOKIE, state, stateCookieOpts);
  return res;
}
