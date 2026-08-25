/** @vitest-environment jsdom */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { state, MockApiClient, MockApiClientError } = vi.hoisted(() => {
  const shared = { meCalls: 0 };
  class ApiClientError extends Error {
    constructor(public readonly status: number, message: string, public readonly code?: string) { super(message); }
  }
  class ApiClient {
    me() {
      shared.meCalls += 1;
      return Promise.resolve({ user: { id: 'member-1', username: 'Member', role: 'PLAYER', status: 'ACTIVE', clubStatus: 'APPROVED', profileImageUrl: null, dartsCounterUrl: null, isMasterAdmin: false } });
    }
    publicOpenLeague() { return Promise.reject(new ApiClientError(404, 'Public league was not found')); }
  }
  return { state: shared, MockApiClient: ApiClient, MockApiClientError: ApiClientError };
});

vi.mock('../../src/client/api', () => ({ ApiClient: MockApiClient, ApiClientError: MockApiClientError }));
vi.mock('../../src/client/auth/GoogleAuth', () => ({ GoogleAuth: class { mountButton() { return Promise.resolve(() => undefined); } } }));

import App from '../../src/client/App';

describe('failed public deep-link regression', () => {
  beforeEach(() => {
    cleanup();
    state.meCalls = 0;
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/league/private-or-missing');
  });

  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('keeps the shared-link context unavailable instead of entering the private workspace', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'League unavailable' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Sign in with Google' })).toBeTruthy();
    await waitFor(() => expect(state.meCalls).toBe(0));
  });
});
