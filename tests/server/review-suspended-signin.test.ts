import { describe, expect, it, vi } from 'vitest';

const suspendedUser = {
  id: 'suspended-1',
  google_sub: 'google-suspended',
  email: 'suspended@example.com',
  username: 'Suspended',
  role: 'PLAYER' as const,
  status: 'SUSPENDED' as const,
  club_status: 'APPROVED' as const,
  is_master_admin: 0,
  profile_image_url: null,
  darts_counter_url: null,
  created_at: '2026-08-01T00:00:00.000Z',
  last_login_at: '2026-08-01T00:00:00.000Z',
};

vi.mock('../../src/server/db/users', () => ({
  createPendingInvitedUser: vi.fn(),
  getUserByGoogleSub: vi.fn(async () => suspendedUser),
  getUserById: vi.fn(async () => suspendedUser),
  publicUser: vi.fn((user) => user),
  refreshGoogleUser: vi.fn(async () => suspendedUser),
  setUsername: vi.fn(),
  upsertGoogleUser: vi.fn(async () => suspendedUser),
}));

import { createAuthRoutes } from '../../src/server/routes/auth';

describe('suspended Google sign-in regression', () => {
  it('returns the dedicated suspension code during fresh Google sign-in', async () => {
    const routes = createAuthRoutes({
      verifyCredential: async () => ({ sub: 'google-suspended', email: 'suspended@example.com', emailVerified: true }),
      now: () => new Date('2026-08-25T03:00:00.000Z'),
    });
    const env = {
      DB: {} as never,
      ASSETS: {} as never,
      GOOGLE_CLIENT_ID: 'client-id',
      APP_ORIGIN: 'https://misfits.test',
    };
    const response = await routes.fetch(new Request('https://misfits.test/api/auth/google', {
      method: 'POST',
      headers: { Origin: 'https://misfits.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'google-id-token-1234567890' }),
    }), env, {} as never);

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: { code: 'ACCOUNT_SUSPENDED' } });
  });
});
