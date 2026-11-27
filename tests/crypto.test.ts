import { describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { encrypt, decrypt, safeEqual } from '@/lib/crypto';

const K = randomBytes(32).toString('base64');

describe('token encryption', () => {
  it('round-trips', () => {
    const box = encrypt('1//refresh-token-abc', K);
    expect(box).toMatch(/^v1\./);
    expect(box).not.toContain('refresh');
    expect(decrypt(box, K)).toBe('1//refresh-token-abc');
  });
  it('uses a fresh IV each time', () => expect(encrypt('x', K)).not.toBe(encrypt('x', K)));
  it('rejects tampering and the wrong key', () => {
    const box = encrypt('secret', K);
    const parts = box.split('.');
    parts[3] = Buffer.from('nope').toString('base64url');
    expect(() => decrypt(parts.join('.'), K)).toThrow();
    expect(() => decrypt(box, randomBytes(32).toString('base64'))).toThrow();
  });
  it('requires a 32-byte key', () => {
    expect(() => encrypt('x', Buffer.from('short').toString('base64'))).toThrow(/32 bytes/);
    expect(() => encrypt('x', '')).toThrow(/TOKEN_ENC_KEY/);
  });
});

describe('safeEqual', () => {
  it('compares secrets', () => {
    expect(safeEqual('abc123', 'abc123')).toBe(true);
    expect(safeEqual('abc123', 'abc124')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
