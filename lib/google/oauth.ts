import 'server-only';
import { OAuth2Client } from 'google-auth-library';
import { siteUrl } from '@/lib/site';

// "Connect Google": the owner signs in with Google and picks one spreadsheet in the Google Picker.
// Scope drive.file = access only to files the user picks (non-sensitive, light Google review).
export const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
export const REDIRECT_PATH = '/api/google/callback';

function env(k: string) { const v = process.env[k]; if (!v) throw new Error(`Server setup missing: ${k}`); return v; }

export function oauthClient() {
  return new OAuth2Client({
    clientId: env('GOOGLE_OAUTH_CLIENT_ID'),
    clientSecret: env('GOOGLE_OAUTH_CLIENT_SECRET'),
    redirectUri: siteUrl() + REDIRECT_PATH,
  });
}

export const googleReady = () => !!(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET && process.env.TOKEN_ENC_KEY
  && process.env.NEXT_PUBLIC_GOOGLE_API_KEY && process.env.NEXT_PUBLIC_GOOGLE_APP_ID);

export function authUrl(state: string, loginHint?: string) {
  return oauthClient().generateAuthUrl({
    access_type: 'offline', prompt: 'consent', include_granted_scopes: true, scope: SCOPES, state,
    ...(loginHint ? { login_hint: loginHint } : {}),
  });
}

export async function exchangeCode(code: string): Promise<string> {
  const { tokens } = await oauthClient().getToken(code);
  if (!tokens.refresh_token) throw new Error('Google didn’t return offline access. Try connecting again.');
  return tokens.refresh_token;
}

// Short-lived access token for the browser Picker, from the stored refresh token.
export async function accessToken(refreshToken: string): Promise<string> {
  const c = oauthClient();
  c.setCredentials({ refresh_token: refreshToken });
  const { token } = await c.getAccessToken();
  if (!token) throw new Error('Google access expired. Connect Google again.');
  return token;
}

// Signed request as the user who connected the sheet (used by sync).
export function userRequester(refreshToken: string) {
  const c = oauthClient();
  c.setCredentials({ refresh_token: refreshToken });
  return async (url: string) => (await c.request({ url })).data;
}
