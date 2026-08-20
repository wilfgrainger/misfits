/** @vitest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const user = {
  id: 'admin-1',
  username: 'Admin',
  role: 'ADMIN' as const,
  status: 'ACTIVE' as const,
  profileImageUrl: null,
  dartsCounterUrl: null,
  isMasterAdmin: true,
};

vi.mock('../../src/client/api', () => {
  class MockApiClientError extends Error {
    constructor(public readonly status: number, message: string) { super(message); }
  }
  class MockApiClient {
    me() { return Promise.resolve({ user, requiresOnboarding: false }); }
    leagues() { return Promise.resolve({ leagues: [] }); }
    myLeagues() { return Promise.resolve({ leagues: [] }); }
    adminLeagues() { return Promise.resolve({ leagues: [] }); }
    adminPlayers() { return Promise.resolve({ players: [] }); }
  }
  return { ApiClient: MockApiClient, ApiClientError: MockApiClientError };
});

vi.mock('../../src/client/auth/GoogleAuth', () => ({ GoogleAuth: class {} }));

import App from '../../src/client/App';

describe('account profile access', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('keeps profile management available to a signed-in user without memberships', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'League desk' })).toBeTruthy());
    expect(screen.getByRole('heading', { name: 'Leagues, properly settled.' })).toBeTruthy();
    expect(screen.getByText('DARTS / LEAGUES')).toBeTruthy();
    expect(screen.queryByAltText('Misfits 501')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Player card' })).toBeTruthy();
    expect(screen.getByLabelText('Nickname')).toBeTruthy();
  });
});
