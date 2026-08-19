import type { Env } from '../env';

const GOOGLE_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
}

export interface GoogleClient {
  buildAuthorizationUrl(state: string): string;
  exchangeCode(code: string): Promise<GoogleIdentity>;
}

export function googleConfigFromEnv(env: Env): GoogleConfig {
  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: `${env.APP_ORIGIN.replace(/\/$/, '')}/auth/google/callback`,
  };
}

export function buildGoogleAuthorizationUrl(config: GoogleConfig, state: string): string {
  const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'openid email',
    state,
  }).toString();
  return url.toString();
}

export async function exchangeGoogleCode(config: GoogleConfig, code: string): Promise<GoogleIdentity> {
  const tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenResponse.ok) throw new Error('Google token exchange failed');
  const token = await tokenResponse.json() as { id_token?: string };
  if (!token.id_token) throw new Error('Google did not return an ID token');

  const { createRemoteJWKSet, jwtVerify } = await import('jose');
  const jwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
  const { payload } = await jwtVerify(token.id_token, jwks, {
    audience: config.clientId,
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
  });
  if (typeof payload.sub !== 'string' || !payload.sub) throw new Error('Google identity is missing sub');
  if (typeof payload.email !== 'string' || !payload.email) throw new Error('Google identity is missing email');
  return {
    sub: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified === true,
  };
}

export function createGoogleClient(env: Env): GoogleClient {
  const config = googleConfigFromEnv(env);
  return {
    buildAuthorizationUrl: (state) => buildGoogleAuthorizationUrl(config, state),
    exchangeCode: (code) => exchangeGoogleCode(config, code),
  };
}
