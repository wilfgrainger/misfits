import { describe, expect, it, vi } from 'vitest';
import { createAuthRoutes } from '../../src/server/routes/auth';

describe('ADM-001 Google-verified administrator identity', () => {
  it('fails closed before touching D1 when the Worker cannot verify the Google credential', async () => {
    const prepare = vi.fn(() => {
      throw new Error('D1 must not be touched for an unverified credential');
    });
    const verifyCredential = vi.fn().mockRejectedValue(new Error('invalid Google token'));
    const routes = createAuthRoutes({ verifyCredential });

    const response = await routes.fetch(new Request('https://misfits.test/api/auth/google', {
      method: 'POST',
      headers: {
        Origin: 'https://misfits.test',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ credential: 'invalid-google-id-token-123456' }),
    }), {
      DB: { prepare } as never,
      ASSETS: {} as never,
      GOOGLE_CLIENT_ID: 'client-id',
      GOOGLE_CLIENT_SECRET: '',
      APP_ORIGIN: 'https://misfits.test',
    }, {} as never);

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: { code: 'UNAUTHENTICATED' } });
    expect(verifyCredential).toHaveBeenCalledWith('invalid-google-id-token-123456', 'client-id');
    expect(prepare).not.toHaveBeenCalled();
  });
});
