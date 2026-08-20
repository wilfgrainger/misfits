import { createRemoteJWKSet, jwtVerify } from 'jose';

const GOOGLE_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

export interface GoogleConfig {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  fetcher?: typeof fetch;
  verifyIdToken?: (idToken: string, clientId: string) => Promise<GoogleClaims>;
}

export interface GoogleClaims {
  sub: string;
  email: string;
  email_verified: boolean;
  iss?: string;
  aud?: string | string[];
  exp?: number;
}

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: true;
}

export async function verifyGoogleCredential(credential: string, clientId: string): Promise<GoogleIdentity> {
  const { payload } = await jwtVerify(credential, GOOGLE_JWKS, {
    issuer: GOOGLE_ISSUERS,
    audience: clientId,
  });
  const claims = payload as unknown as GoogleClaims;
  if (!claims.sub || !claims.email || claims.email_verified !== true) {
    throw new Error('Google account must have a verified email');
  }
  return { sub: claims.sub, email: claims.email, emailVerified: true };
}

export function buildGoogleAuthorizationUrl(
  config: Pick<GoogleConfig, 'clientId' | 'redirectUri'>,
  state: string,
): string {
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

async function verifyGoogleIdToken(idToken: string, clientId: string): Promise<GoogleClaims> {
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: GOOGLE_ISSUERS,
    audience: clientId,
  });
  const claims = payload as unknown as GoogleClaims;
  if (!claims.sub || !claims.email || claims.email_verified !== true) {
    throw new Error('Google account must have a verified email');
  }
  return claims;
}

export async function exchangeGoogleCode(config: GoogleConfig, code: string): Promise<GoogleIdentity> {
  if (!config.clientSecret) throw new Error('Google client secret is not configured');
  const fetcher = config.fetcher ?? fetch;
  const response = await fetcher(GOOGLE_TOKEN_ENDPOINT, {
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
  if (!response.ok) throw new Error('Google authorization code exchange failed');

  const tokenResponse = await response.json() as { id_token?: unknown };
  if (typeof tokenResponse.id_token !== 'string' || !tokenResponse.id_token) {
    throw new Error('Google response did not contain an ID token');
  }

  const claims = await (config.verifyIdToken ?? verifyGoogleIdToken)(tokenResponse.id_token, config.clientId);
  if (!claims.sub || !claims.email || claims.email_verified !== true) {
    throw new Error('Google account must have a verified email');
  }
  return { sub: claims.sub, email: claims.email, emailVerified: true };
}
