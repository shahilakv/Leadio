// Public base URL of the app (used for email links). Falls back to Vercel's URL, then localhost.
export function siteUrl() {
  const u = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  return u.replace(/\/+$/, '');
}

// Only allow redirects to our own pages ("/app", not "//evil.com" or "https://...").
export function safeNext(next: unknown, fallback = '/app') {
  return typeof next === 'string' && /^\/(?!\/)[\w\-/?=&%.]*$/.test(next) ? next : fallback;
}
