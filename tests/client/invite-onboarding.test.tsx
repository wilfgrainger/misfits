/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { state, MockApiClient, MockApiClientError } = vi.hoisted(() => {
  const shared = {
    leagueCalls: 0,
    myLeagueCalls: 0,
    user: {
      id: 'user-1', username: null as string | null, role: 'PLAYER' as const, status: 'ACTIVE' as const,
      clubStatus: 'APPROVED' as const, profileImageUrl: null, dartsCounterUrl: null, isMasterAdmin: false,
    },
  };
  class ApiClientError extends Error {
    constructor(public readonly status: number, message: string, public readonly code?: string) { super(message); }
  }
  class ApiClient {
    me() { return Promise.resolve({ user: shared.user, requiresOnboarding: true }); }
    leagues() { shared.leagueCalls += 1; return Promise.resolve({ leagues: [] }); }
    myLeagues() { shared.myLeagueCalls += 1; return Promise.resolve({ leagues: [] }); }
    setUsername(username: string) {
      shared.user = { ...shared.user, username };
      return Promise.resolve({ user: shared.user, requiresOnboarding: false });
    }
    profile() { return Promise.resolve({ profile: { username: shared.user.username, profileImageUrl: null, dartsCounterUrl: null } }); }
    updateProfile() { return Promise.resolve({ profile: shared.user }); }
  }
  return { state: shared, MockApiClient: ApiClient, MockApiClientError: ApiClientError };
});

vi.mock('../../src/client/api', () => ({ ApiClient: MockApiClient, ApiClientError: MockApiClientError }));
vi.mock('../../src/client/auth/GoogleAuth', () => ({ GoogleAuth: class {} }));

import App from '../../src/client/App';

describe('approved-member onboarding', () => {
  beforeEach(() => {
    cleanup();
    state.leagueCalls = 0;
    state.myLeagueCalls = 0;
    state.user = { ...state.user, username: null };
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('saves the nickname and enters the private club without a league self-join step', async () => {
    render(<App />);
    await screen.findByRole('heading', { name: 'Set your player nickname' });
    expect(state.leagueCalls).toBe(0);

    fireEvent.change(screen.getByLabelText('Nickname'), { target: { value: 'New Player' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enter Misfits' }));

    await waitFor(() => expect(screen.getByRole('heading', { name: "You're in the club." })).toBeTruthy());
    expect(state.user.username).toBe('New Player');
    expect(state.leagueCalls).toBe(1);
    expect(state.myLeagueCalls).toBe(1);
  });
});
