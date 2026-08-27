/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const calls = {
  signIn: [] as Array<[string, string | undefined]>,
  leagues: 0,
  myLeagues: 0,
};

let meResult: () => Promise<unknown>;
let signInResult: () => Promise<unknown>;

vi.mock('../../src/client/api', () => {
  class MockApiClientError extends Error {
    constructor(public readonly status: number, message: string, public readonly code?: string) { super(message); }
  }
  class MockApiClient {
    me() { return meResult(); }
    signIn(credential: string, inviteToken?: string) {
      calls.signIn.push([credential, inviteToken]);
      return signInResult();
    }
    leagues() { calls.leagues += 1; return Promise.resolve({ leagues: [] }); }
    myLeagues() { calls.myLeagues += 1; return Promise.resolve({ leagues: [] }); }
    logout() { return Promise.resolve({ ok: true }); }
    setUsername() { throw new Error('not expected'); }
  }
  return { ApiClient: MockApiClient, ApiClientError: MockApiClientError };
});

vi.mock('../../src/client/auth/GoogleAuth', () => ({
  GoogleAuth: class {
    mountButton(parent: HTMLElement, onCredential: (credential: string) => void) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Google test sign-in';
      button.addEventListener('click', () => onCredential('google-credential'));
      parent.replaceChildren(button);
      return Promise.resolve(() => parent.replaceChildren());
    }
  }
}));

import { ApiClientError } from '../../src/client/api';
import App from '../../src/client/App';

const approvedUser = {
  id: 'member-1', username: 'Alpha', role: 'PLAYER' as const, status: 'ACTIVE' as const, clubStatus: 'APPROVED' as const,
  profileImageUrl: null, dartsCounterUrl: null, isMasterAdmin: false,
};
const pendingUser = { ...approvedUser, id: 'pending-1', username: null, clubStatus: 'PENDING' as const };
const rejectedUser = { ...approvedUser, id: 'rejected-1', username: null, clubStatus: 'REJECTED' as const };

function unauthenticated(code?: string, message = 'Sign in required') {
  return Promise.reject(new ApiClientError(401, message, code));
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolver) => { resolve = resolver; });
  return { promise, resolve };
}

describe('private club entry', () => {
  beforeEach(() => {
    cleanup();
    calls.signIn.length = 0;
    calls.leagues = 0;
    calls.myLeagues = 0;
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/');
    meResult = () => unauthenticated();
    signInResult = () => Promise.resolve({ user: approvedUser, requiresOnboarding: false });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('reveals no club data and loads no leagues before membership approval resolves', async () => {
    const auth = deferred<{ user: typeof approvedUser; requiresOnboarding: boolean }>();
    meResult = () => auth.promise;
    render(<App />);

    expect(screen.getByAltText('Misfits 501 club seal')).toBeTruthy();
    expect(screen.queryByText(/Standings/i)).toBeNull();
    expect(screen.queryByText(/Latest results/i)).toBeNull();
    expect(calls.leagues).toBe(0);
    expect(calls.myLeagues).toBe(0);

    auth.resolve({ user: approvedUser, requiresOnboarding: false });
    await waitFor(() => expect(calls.leagues).toBe(1));
  });

  it('shows a privacy-safe signed-out splash and keeps INVITE_REQUIRED outside the club', async () => {
    meResult = () => unauthenticated();
    signInResult = () => unauthenticated('INVITE_REQUIRED', 'A club invitation is required');
    render(<App />);

    expect(await screen.findByRole('button', { name: 'Google test sign-in' })).toBeTruthy();
    expect(screen.getByText('Misfits Darts Club')).toBeTruthy();
    expect(screen.queryByText(/No public leagues/i)).toBeNull();
    expect(screen.queryByText(/table and match results/i)).toBeNull();
    expect(calls.leagues).toBe(0);

    fireEvent.click(screen.getByRole('button', { name: 'Google test sign-in' }));
    await waitFor(() => expect(screen.getByText('A club invitation is required')).toBeTruthy());
    expect(calls.leagues).toBe(0);
  });

  it('presents the club promise and admission card without mounting protected club data', async () => {
    meResult = () => Promise.reject(new ApiClientError(401, 'Unauthenticated'));
    render(<App />);

    const title = await screen.findByRole('heading', { name: 'Misfits 501' });
    expect(title.closest('.private-entry-masthead')).toBeTruthy();
    expect(await screen.findByText('Club darts, properly settled.')).toBeTruthy();
    const admissionCard = screen.getByRole('group', { name: 'Sign in with Google' });
    expect(admissionCard.classList.contains('private-admission-card')).toBe(true);
    expect(admissionCard.closest('.private-entry-v2')).toBeTruthy();
    expect(screen.getByText(/League tables, results and member details stay private/i)).toBeTruthy();
    expect(screen.queryByText('Your competitions')).toBeNull();
    expect(calls.leagues).toBe(0);
    expect(calls.myLeagues).toBe(0);
  });

  it('carries a club invitation only into Google admission and removes the raw token after sign-in', async () => {
    window.history.replaceState({}, '', '/join/club-secret-token');
    meResult = () => unauthenticated();
    signInResult = () => Promise.resolve({ user: pendingUser, requiresOnboarding: true });
    render(<App />);

    expect(await screen.findByText("You've been invited to join Misfits")).toBeTruthy();
    expect(window.sessionStorage.getItem('misfits_pending_club_invite')).toBe('club-secret-token');
    fireEvent.click(await screen.findByRole('button', { name: 'Google test sign-in' }));

    await waitFor(() => expect(calls.signIn).toEqual([['google-credential', 'club-secret-token']]));
    await screen.findByText('Membership request sent');
    expect(window.sessionStorage.getItem('misfits_pending_club_invite')).toBeNull();
    expect(window.location.pathname).toBe('/');
    expect(calls.leagues).toBe(0);
  });

  it('renders pending membership as a locked waiting state with sign out only', async () => {
    meResult = () => Promise.resolve({ user: pendingUser, requiresOnboarding: true });
    render(<App />);

    expect(await screen.findByText('Membership request sent')).toBeTruthy();
    expect(screen.getByText('Waiting for a club admin to approve you')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy();
    expect(screen.queryByText('League')).toBeNull();
    expect(calls.leagues).toBe(0);
    expect(calls.myLeagues).toBe(0);
  });

  it('renders rejected membership without loading the club application', async () => {
    meResult = () => Promise.resolve({ user: rejectedUser, requiresOnboarding: true });
    render(<App />);

    expect(await screen.findByText('Membership request not approved')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy();
    expect(screen.queryByText('League')).toBeNull();
    expect(calls.leagues).toBe(0);
    expect(calls.myLeagues).toBe(0);
  });

  it('renders a clear suspended-account state without loading club data', async () => {
    meResult = () => Promise.reject(new ApiClientError(403, 'This account is suspended. Contact a club administrator.', 'ACCOUNT_SUSPENDED'));
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Account suspended' })).toBeTruthy();
    expect(screen.getByText('Contact a club administrator if you think this is a mistake.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy();
    expect(calls.leagues).toBe(0);
    expect(calls.myLeagues).toBe(0);
  });

  it('uses approved membership plus missing nickname to enter onboarding', async () => {
    meResult = () => Promise.resolve({ user: { ...approvedUser, username: null }, requiresOnboarding: false });
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Set your player nickname' })).toBeTruthy();
    expect(calls.leagues).toBe(0);
    expect(calls.myLeagues).toBe(0);
  });

  it('lands approved members on Home with the club-first global navigation', async () => {
    meResult = () => Promise.resolve({ user: approvedUser, requiresOnboarding: false });
    render(<App />);

    expect(await screen.findByRole('button', { name: 'Home' })).toBeTruthy();
    const nav = screen.getByRole('navigation', { name: 'Member workspace' });
    expect(within(nav).getAllByRole('button').map((button) => button.textContent?.trim()))
      .toEqual(['Home', 'Record', 'Leagues', 'More']);
    expect(screen.getByRole('button', { name: 'Home' }).getAttribute('aria-current')).toBe('page');
    expect(screen.queryByText('Your Misfits 501 club workspace is ready.')).toBeNull();
  });
});
