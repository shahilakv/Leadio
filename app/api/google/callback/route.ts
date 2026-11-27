import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { activeCompany } from '@/lib/company';
import { exchangeCode } from '@/lib/google/oauth';
import { setPending, STATE_COOKIE } from '@/lib/google/pending';
import { safeEqual } from '@/lib/crypto';

// GET /api/google/callback?code=&state= : Google sends the owner back here after consent.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const back = (q: string) => {
    const res = NextResponse.redirect(new URL(`/onboarding/sheet?${q}`, req.url));
    res.cookies.delete(STATE_COOKIE);
    return res;
  };
  const jar = await cookies();
  const expected = jar.get(STATE_COOKIE)?.value || '';
  const state = p.get('state') || '';
  if (p.get('error')) return back('gerr=' + encodeURIComponent(p.get('error') === 'access_denied' ? 'Google access wasn’t allowed.' : 'Google sign-in was cancelled.'));
  if (!expected || !state || !safeEqual(expected, state)) return back('gerr=' + encodeURIComponent('That Google sign-in expired. Try again.'));
  const company = await activeCompany();
  if (!company || company.role !== 'owner') return back('gerr=' + encodeURIComponent('Only the company owner can connect Google.'));
  try {
    await setPending(await exchangeCode(p.get('code') || ''));
    return back('via=google');
  } catch (e) {
    return back('gerr=' + encodeURIComponent(e instanceof Error ? e.message : 'Google sign-in failed.'));
  }
}
