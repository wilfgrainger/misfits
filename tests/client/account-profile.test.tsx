/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let user = {
  id: 'admin-1',
  username: 'Admin',
  role: 'ADMIN' as const,
  status: 'ACTIVE' as const,
  clubStatus: 'APPROVED' as const,
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
    adminSeasons() { return Promise.resolve({ seasons: [] }); }
    seasonLeagues() { return Promise.resolve({ leagues: [] }); }
    adminClubInvites() { return Promise.resolve({ invites: [] }); }
    adminPlayers() { return Promise.resolve({ players: [{ id: 'player-1', username: 'Player', role: 'PLAYER', status: 'ACTIVE', clubStatus: 'APPROVED', createdAt: '2026-08-01T00:00:00.000Z', profileImageUrl: null, dartsCounterUrl: null, isMasterAdmin: false, email: 'player@example.com', leagueActive: false }] }); }
    updateProfile() { return Promise.resolve({ profile: user }); }
  }
  return { ApiClient: MockApiClient, ApiClientError: MockApiClientError };
});

vi.mock('../../src/client/auth/GoogleAuth', () => ({ GoogleAuth: class {} }));

import App from '../../src/client/App';

describe('account profile access', () => {
  beforeEach(() => {
    cleanup();
    vi.restoreAllMocks();
    user.isMasterAdmin = true;
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('keeps club-first navigation and profile available before any league is published', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Good to see you, Admin.' })).toBeTruthy();
    expect(screen.getByText('Misfits Darts Club')).toBeTruthy();
    expect(screen.getByAltText('Misfits 501 club seal')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Season admin' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Club table' })).toBeNull();

    const nav = screen.getByRole('navigation', { name: 'Member workspace' });
    expect(within(nav).getAllByRole('button').map((button) => button.textContent?.trim()))
      .toEqual(['Home', 'Record', 'Leagues', 'More']);

    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Profile' }));
    expect(await screen.findByRole('heading', { name: 'Player card' })).toBeTruthy();
    expect(screen.getByLabelText('Nickname')).toBeTruthy();
  });

  it('keeps Club access reachable through More for an administrator with no leagues yet', async () => {
    user.isMasterAdmin = false;
    render(<App />);

    await screen.findByRole('heading', { name: 'Good to see you, Admin.' });
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Admin' }));

    await waitFor(() => expect(screen.getByRole('tab', { name: 'Club access' })).toBeTruthy());
    fireEvent.click(screen.getByRole('tab', { name: 'Club access' }));
    await waitFor(() => expect(screen.getByRole('region', { name: 'Club members' })).toBeTruthy());
    await waitFor(() => expect(screen.getByRole('button', { name: /Make .* admin/ })).toBeTruthy());
  });
});
