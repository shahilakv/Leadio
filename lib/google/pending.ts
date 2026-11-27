import 'server-only';
import { cookies } from 'next/headers';
import { encrypt, decrypt } from '@/lib/crypto';

// Between "Connect Google" and saving the sheet, the refresh token waits in an encrypted,
// httpOnly cookie for 30 minutes. On save it moves to source_secrets and the cookie is cleared.
export const PENDING_COOKIE = 'ld_gtok';
export const STATE_COOKIE = 'ld_gstate';
const opts = { path: '/', sameSite: 'lax' as const, httpOnly: true, secure: true };

export async function setPending(refreshToken: string) {
  (await cookies()).set(PENDING_COOKIE, encrypt(refreshToken), { ...opts, maxAge: 30 * 60 });
}
export async function getPending(): Promise<string | null> {
  const v = (await cookies()).get(PENDING_COOKIE)?.value;
  if (!v) return null;
  try { return decrypt(v); } catch { return null; }
}
export async function clearPending() {
  (await cookies()).delete(PENDING_COOKIE);
}
export const stateCookieOpts = { ...opts, maxAge: 10 * 60 };
