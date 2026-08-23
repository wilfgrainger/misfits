/** @vitest-environment jsdom */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { state, MockApiClient, MockApiClientError } = vi.hoisted(() => {
  const shared = { leagueCalls: 0 };
  class ApiClientError extends Error {
    constructor(public readonly status: number, message: string, public readonly code?: string) { super(message); }
  }
  class ApiClient {
    me() { return Promise.reject(new ApiClientError(401, 'Sign-in required')); }
    leagues() { shared.leagueCalls += 1; return Promise.resolve({ leagues: [] }); }
  }
  return { state: shared, MockApiClient: ApiClient, MockApiClientError: ApiClientError };
});

vi.mock('../../src/client/api', () => ({ ApiClient: MockApiClient, ApiClientError: MockApiClientError }));
vi.mock('../../src/client/auth/GoogleAuth', () => ({ GoogleAuth: class { mountButton() { return Promise.resolve(() => undefined); } } }));

import App from '../../src/client/App';

describe('private signed-out UX', () => {
  beforeEach(() => {
    cleanup();
    state.leagueCalls = 0;
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('shows a privacy-safe members-club entry without loading league data', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Welcome to Misfits' })).toBeTruthy();
    expect(screen.getByText('Existing members can sign in with Google. New members need a private club invitation.')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Sign in with Google' })).toBeTruthy();
    expect(screen.getByText(/League tables, results and member details stay private/)).toBeTruthy();
    expect(screen.queryByText('Standings')).toBeNull();
    expect(screen.queryByText('Latest results')).toBeNull();
    await waitFor(() => expect(state.leagueCalls).toBe(0));
  });

  it('treats a league-shaped deep link as private until membership is approved', async () => {
    window.history.replaceState({}, '', '/league/tuesday-club');
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Welcome to Misfits' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Tuesday Club' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Share league' })).toBeNull();
    expect(state.leagueCalls).toBe(0);
  });
});
