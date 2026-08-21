/** @vitest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let user = {
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
    adminPlayers() { return Promise.resolve({ players: [{ id: 'player-1', username: 'Player', role: 'PLAYER', status: 'ACTIVE', profileImageUrl: null, dartsCounterUrl: null, isMasterAdmin: false, email: 'player@example.com', leagueActive: false }] }); }
  }
  return { ApiClient: MockApiClient, ApiClientError: MockApiClientError };
});

vi.mock('../../src/client/auth/GoogleAuth', () => ({ GoogleAuth: class {} }));

import App from '../../src/client/App';

describe('account profile access', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    user.isMasterAdmin = true;
  });

  it('keeps profile management available to a signed-in user without memberships', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'League desk' })).toBeTruthy());
    expect(screen.getByRole('heading', { name: 'Club darts,beautifully settled.' })).toBeTruthy();
    expect(screen.getByText('THE MISFITS 501 CLUB')).toBeTruthy();
    expect(screen.getByText('One club, well kept.')).toBeTruthy();
    expect(screen.queryByText('WhatsApp for members')).toBeNull();
    expect(screen.getByAltText('Misfits 501')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Player card' })).toBeTruthy();
    expect(screen.getByLabelText('Nickname')).toBeTruthy();
  });

  it('shows People controls to promoted administrators', async () => {
    user.isMasterAdmin = false;
    render(<App />);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'People' })).toBeTruthy());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Make admin' })).toBeTruthy());
  });
});
