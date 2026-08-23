import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiClientError } from '../../src/client/api';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('private club API client', () => {
  it('passes a club invite token with Google sign-in when present', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => new Response(JSON.stringify({
      user: {
        id: 'user-1', username: null, role: 'PLAYER', status: 'ACTIVE', clubStatus: 'PENDING',
        profileImageUrl: null, dartsCounterUrl: null, isMasterAdmin: false,
      },
      requiresOnboarding: true,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await new ApiClient().signIn('credential-token', 'club-invite-token');

    expect(fetchMock).toHaveBeenCalledOnce();
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toEqual({ credential: 'credential-token', inviteToken: 'club-invite-token' });
  });

  it('preserves machine-readable API error codes', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      error: { code: 'INVITE_REQUIRED', message: 'A Misfits invitation is required' },
    }), { status: 403, headers: { 'Content-Type': 'application/json' } })));

    let caught: unknown;
    try {
      await new ApiClient().signIn('credential-token');
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ApiClientError);
    expect(caught).toMatchObject({ status: 403, code: 'INVITE_REQUIRED', message: 'A Misfits invitation is required' });
  });
});
