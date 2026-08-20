import { describe, expect, it, vi } from 'vitest';
import {
  buildGoogleAuthorizationUrl,
  exchangeGoogleCode,
} from '../../src/server/auth/google';

describe('Google OIDC client', () => {
  it('builds a minimal authorization-code URL', () => {
    const url = new URL(buildGoogleAuthorizationUrl({
      clientId: 'client-id',
      redirectUri: 'https://misfits.test/auth/google/callback',
    }, 'state-value'));

    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('client_id')).toBe('client-id');
    expect(url.searchParams.get('redirect_uri')).toBe('https://misfits.test/auth/google/callback');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('openid email');
    expect(url.searchParams.get('state')).toBe('state-value');
  });

  it('exchanges a code and rejects an unverified email', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id_token: 'id-token' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    await expect(exchangeGoogleCode({
      clientId: 'client-id',
      clientSecret: 'secret',
      redirectUri: 'https://misfits.test/auth/google/callback',
      fetcher,
      verifyIdToken: async () => ({
        sub: 'google-sub',
        email: 'player@example.com',
        email_verified: false,
      }),
    }, 'auth-code')).rejects.toThrow('verified email');

    expect(fetcher).toHaveBeenCalledOnce();
    const [, init] = fetcher.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(String(init.body)).toContain('code=auth-code');
  });
});
