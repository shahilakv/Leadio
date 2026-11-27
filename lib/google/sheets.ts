import 'server-only';
import { JWT } from 'google-auth-library';
import { userRequester } from '@/lib/google/oauth';

// Google Sheets access as our robot (service account). Companies share their sheet with ROBOT email.
// Read-only: Lead Desk never writes to a company's sheet.

type Key = { client_email: string; private_key: string };
let key: Key | null = null;
let jwt: JWT | null = null;

function serviceKey(): Key {
  if (key) return key;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new SheetError('setup', 'Server setup missing: GOOGLE_SERVICE_ACCOUNT_JSON');
  try { key = JSON.parse(raw) as Key; } catch { throw new SheetError('setup', 'GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON'); }
  if (!key.client_email || !key.private_key) throw new SheetError('setup', 'GOOGLE_SERVICE_ACCOUNT_JSON is missing client_email or private_key');
  return key;
}

// The email companies must share their sheet with.
export function robotEmail(): string | null {
  try { return serviceKey().client_email; } catch { return null; }
}

export class SheetError extends Error {
  constructor(public kind: 'setup' | 'no_access' | 'not_found' | 'google', message: string) { super(message); }
}

type Fetcher = (url: string) => Promise<unknown>;

// Real fetcher: signed requests with the robot's token. Tests pass a fake one.
const googleFetch: Fetcher = async url => {
  const k = serviceKey();
  jwt = jwt || new JWT({ email: k.client_email, key: k.private_key, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
  try {
    return (await jwt.request({ url })).data;
  } catch (e) {
    const err = e as { response?: { status?: number; data?: { error?: { message?: string } } }; message?: string };
    const status = err.response?.status;
    const msg = err.response?.data?.error?.message || err.message || 'Google error';
    if (status === 403) throw new SheetError('no_access', `Lead Desk can't open this sheet yet. Share it with ${k.client_email} (Viewer is enough).`);
    if (status === 404) throw new SheetError('not_found', 'Sheet not found. Check the link.');
    throw new SheetError('google', msg);
  }
};

const BASE = 'https://sheets.googleapis.com/v4/spreadsheets/';
const range = (tab: string, a1 = '') => `'${tab.replace(/'/g, "''")}'${a1 ? '!' + a1 : ''}`;

export type SheetMeta = { title: string; tabs: { title: string; gid: number }[] };

export function makeSheets(fetcher: Fetcher = googleFetch) {
  return {
    async meta(id: string): Promise<SheetMeta> {
      const r = await fetcher(`${BASE}${encodeURIComponent(id)}?fields=properties.title,sheets.properties(sheetId,title)`) as
        { properties?: { title?: string }; sheets?: { properties: { sheetId: number; title: string } }[] };
      return {
        title: r.properties?.title || 'Untitled sheet',
        tabs: (r.sheets || []).map(s => ({ title: s.properties.title, gid: s.properties.sheetId })),
      };
    },
    // All rows of a tab as display text (row 1 = headers).
    async values(id: string, tab: string, a1 = ''): Promise<string[][]> {
      const r = await fetcher(`${BASE}${encodeURIComponent(id)}/values/${encodeURIComponent(range(tab, a1))}?valueRenderOption=FORMATTED_VALUE&majorDimension=ROWS`) as { values?: unknown[][] };
      return (r.values || []).map(row => row.map(v => (v == null ? '' : String(v))));
    },
  };
}

export const sheets = makeSheets();

// Same client, acting as the Google user who connected the sheet with "Connect Google".
export function oauthSheets(refreshToken: string) {
  const request = userRequester(refreshToken);
  return makeSheets(async url => {
    try { return await request(url); }
    catch (e) {
      const err = e as { response?: { status?: number; data?: { error?: string | { message?: string } } }; message?: string };
      const status = err.response?.status;
      const data = err.response?.data?.error;
      if (data === 'invalid_grant' || status === 401) throw new SheetError('no_access', 'Google access was removed. The owner needs to connect Google again in Settings.');
      if (status === 403 || status === 404) throw new SheetError('no_access', 'Lead Desk can’t open this sheet with the connected Google account. Pick it again with “Connect Google”.');
      throw new SheetError('google', (typeof data === 'object' && data?.message) || err.message || 'Google error');
    }
  });
}
