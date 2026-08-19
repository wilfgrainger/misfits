// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/client/App';
import { api, ApiClientError } from '../../src/client/api/client';

function json(body: unknown, status = 200) {
  return Promise.resolve(new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }));
}

function installFetch(options: {
  onboarding?: boolean;
  usernameError?: boolean;
  submitError?: boolean;
  currentUserId?: string;
  results?: any[];
} = {}) {
  const userId = options.currentUserId ?? 'alice';
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'https://misfits.test');
    const method = init?.method ?? 'GET';
    if (url.pathname === '/api/me' && method === 'GET') {
      return json({
        user: { id: userId, email: `${userId}@example.test`, username: options.onboarding ? null : userId === 'bob' ? 'Bob' : 'Alice', role: 'PLAYER', status: 'ACTIVE' },
        requiresOnboarding: Boolean(options.onboarding),
      });
    }
    if (url.pathname === '/api/me/username' && method === 'POST') {
      if (options.usernameError) return json({ error: { code: 'USERNAME_UNAVAILABLE', message: 'That username is already taken.' } }, 409);
      return json({ user: { id: userId, email: `${userId}@example.test`, username: 'Alice The Dart', role: 'PLAYER', status: 'ACTIVE' }, requiresOnboarding: false });
    }
    if (url.pathname === '/api/me/opponents') return json({ opponents: [{ id: 'bob', username: 'Bob' }] });
    if (url.pathname === '/api/me/results') return json({ results: options.results ?? [] });
    if (url.pathname === '/api/results' && method === 'POST') {
      if (options.submitError) return json({ error: { code: 'INVALID_RESULT', message: 'That score is not valid.' } }, 400);
      return json({ result: { id: 'r-new', status: 'PENDING' } }, 201);
    }
    if (/^\/api\/results\/[^/]+\/(confirm|dispute)$/.test(url.pathname) && method === 'POST') {
      return json({ result: { id: 'r1', status: url.pathname.endsWith('/confirm') ? 'CONFIRMED' : 'DISPUTED' } });
    }
    if (url.pathname.startsWith('/api/public/')) return json(url.pathname.endsWith('/league') ? { league: { id: 'misfits-501', name: 'Misfits 501', slug: 'misfits-501', seasonName: '2026', status: 'OPEN', pointsPerWin: 2, targetLegs: 3 }, standings: [] } : { results: [], players: [] });
    throw new Error(`Unhandled fetch ${method} ${url.pathname}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('player experience', () => {
  it('forces first-time users into onboarding and submits a normalized username', async () => {
    const fetchMock = installFetch({ onboarding: true });
    window.history.pushState({}, '', '/me');
    render(<App />);
    expect(await screen.findByRole('heading', { name: /choose your misfits name/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: '  Alice   The Dart  ' } });
    fireEvent.click(screen.getByRole('button', { name: /save username/i }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([input]) => String(input) === '/api/me/username');
      expect(call).toBeTruthy();
      expect(JSON.parse(String(call?.[1]?.body))).toEqual({ username: 'Alice The Dart' });
    });
  });

  it('keeps onboarding input and displays username uniqueness errors', async () => {
    installFetch({ onboarding: true, usernameError: true });
    window.history.pushState({}, '', '/onboarding');
    render(<App />);
    const input = await screen.findByLabelText(/username/i);
    fireEvent.change(input, { target: { value: 'Taken Name' } });
    fireEvent.click(screen.getByRole('button', { name: /save username/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/already taken/i);
    expect(input).toHaveValue('Taken Name');
  });

  it('shows pending opponent actions on the player dashboard', async () => {
    installFetch({ results: [{
      id: 'r1', status: 'PENDING', playerAId: 'bob', playerAUsername: 'Bob', playerALegs: 3,
      playerBId: 'alice', playerBUsername: 'Alice', playerBLegs: 2, submittedBy: 'bob', confirmedBy: null,
      disputeNote: null, createdAt: '2026-08-19T20:00:00Z', updatedAt: '2026-08-19T20:00:00Z', confirmedAt: null, canRespond: true,
    }] });
    window.history.pushState({}, '', '/me');
    render(<App />);
    expect(await screen.findByText(/bob reported 3 - 2/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /review result/i })).toHaveAttribute('href', '/my-results');
  });

  it('keeps entered result values after a recoverable validation error', async () => {
    installFetch();
    vi.spyOn(api, 'submitResult').mockRejectedValue(new ApiClientError(400, 'INVALID_RESULT', 'That score is not valid.'));
    window.history.pushState({}, '', '/results/new');
    render(<App />);
    const opponent = await screen.findByLabelText(/^opponent$/i);
    await screen.findByRole('option', { name: 'Bob' });
    const mine = screen.getByLabelText(/my legs/i);
    const theirs = screen.getByLabelText(/^opponent legs$/i);
    fireEvent.change(opponent, { target: { value: 'bob' } });
    fireEvent.change(mine, { target: { value: '2' } });
    fireEvent.change(theirs, { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /submit result/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/not valid/i);
    expect(opponent).toHaveValue('bob');
    expect(mine).toHaveValue(2);
    expect(theirs).toHaveValue(1);
  });

  it('lets the opposing player confirm or dispute a pending result', async () => {
    const fetchMock = installFetch({ results: [{
      id: 'r1', status: 'PENDING', playerAId: 'alice', playerAUsername: 'Alice', playerALegs: 3,
      playerBId: 'bob', playerBUsername: 'Bob', playerBLegs: 1, submittedBy: 'alice', confirmedBy: null,
      disputeNote: null, createdAt: '2026-08-19T20:00:00Z', updatedAt: '2026-08-19T20:00:00Z', confirmedAt: null, canRespond: true,
    }], currentUserId: 'bob' });
    window.history.pushState({}, '', '/my-results');
    render(<App />);
    expect(await screen.findByRole('button', { name: /confirm/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dispute/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => String(input) === '/api/results/r1/confirm')).toBe(true));
  });

  it('does not show response controls when the server says the player cannot respond', async () => {
    installFetch({ results: [{
      id: 'r1', status: 'PENDING', playerAId: 'alice', playerAUsername: 'Alice', playerALegs: 3,
      playerBId: 'bob', playerBUsername: 'Bob', playerBLegs: 1, submittedBy: 'alice', confirmedBy: null,
      disputeNote: null, createdAt: '2026-08-19T20:00:00Z', updatedAt: '2026-08-19T20:00:00Z', confirmedAt: null, canRespond: false,
    }] });
    window.history.pushState({}, '', '/my-results');
    render(<App />);
    await screen.findByText(/pending/i);
    expect(screen.queryByRole('button', { name: /confirm/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /dispute/i })).not.toBeInTheDocument();
  });
});
