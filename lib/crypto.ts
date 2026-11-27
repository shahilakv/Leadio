import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual, createHash } from 'node:crypto';

// AES-256-GCM for Google refresh tokens at rest. Key: TOKEN_ENC_KEY (32 random bytes, base64).
// Output: "v1.<iv>.<tag>.<ciphertext>" (base64url parts).

function key(raw = process.env.TOKEN_ENC_KEY): Buffer {
  if (!raw) throw new Error('Server setup missing: TOKEN_ENC_KEY');
  const k = Buffer.from(raw, 'base64');
  if (k.length !== 32) throw new Error('TOKEN_ENC_KEY must be 32 bytes, base64-encoded');
  return k;
}

export function encrypt(plain: string, rawKey?: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key(rawKey), iv);
  const data = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), data.toString('base64url')].join('.');
}

export function decrypt(box: string, rawKey?: string): string {
  const [v, iv, tag, data] = String(box).split('.');
  if (v !== 'v1' || !iv || !tag || !data) throw new Error('Unreadable token');
  const d = createDecipheriv('aes-256-gcm', key(rawKey), Buffer.from(iv, 'base64url'));
  d.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([d.update(Buffer.from(data, 'base64url')), d.final()]).toString('utf8');
}

// Constant-time string compare (for the cron secret and OAuth state).
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest(), hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb) && a.length === b.length;
}
