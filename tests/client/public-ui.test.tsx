// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/client/App';

const league = {
  league: { id: 'misfits-501', name: 'Misfits 501', slug: 'misfits-501', seasonName: '2026', status: 'OPEN', pointsPerWin: 2, targetLegs: 3 },
  standings: [
    { userId: 'a', username: 'Alpha', played: 4, won: 3, lost: 1, legsFor: 11, legsAgainst: 6, legDifference: 5, points: 6 },
    { userId: 'b', username: 'Bravo', played: 4, won: 1, lost: 3, legsFor: 6, legsAgainst: 11, legDifference: -5, points: 2 },
  ],
};
const results = {
  results: [
    {
      id: 'r1', status: 'CONFIRMED', createdAt: '2026-08-18T20:00:00.000Z', confirmedAt: '2026-08-18T20:05:00.000Z',
      playerA: { id: 'a', username: 'Alpha', legs: 3 },
      playerB: { id: 'b', username: 'Bravo', legs: 1 },
    },
  ],
};
const players = { players: [{ id: 'a', username: 'Alpha' }, { id: 'b', username: 'Bravo' }] };

function response(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }));
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
    const url = new URL(String(input), 'https://misfits.test');
    if (url.pathname === '/api/me') return response({ error: { code: 'UNAUTHENTICATED', message: 'Sign in is required.' } }, 401);
    if (url.pathname === '/api/public/league') return response(league);
    if (url.pathname === '/api/public/results') return response(results);
    if (url.pathname === '/api/public/players') return response(players);
    throw new Error(`Unhandled fetch: ${url.pathname}`);
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('public React experience', () => {
  it('puts the league table and latest results on the homepage for signed-out visitors', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    expect(await screen.findByRole('heading', { name: /misfits 501/i })).toBeInTheDocument();
    expect(await screen.findByRole('table', { name: /league table/i })).toBeInTheDocument();
    for (const heading of ['#', 'Player', 'P', 'W', 'L', '+/-', 'PTS']) {
      expect(screen.getByRole('columnheader', { name: heading })).toBeInTheDocument();
    }
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /latest results/i })).toBeInTheDocument();
    expect(screen.getByText(/3\s*[-–]\s*1/)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('@');
  });

  it('shows public results without requiring a session', async () => {
    window.history.pushState({}, '', '/results');
    render(<App />);
    expect(await screen.findByRole('heading', { name: /^results$/i })).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Bravo')).toBeInTheDocument();
  });

  it('shows only public usernames on the player page', async () => {
    window.history.pushState({}, '', '/players');
    render(<App />);
    expect(await screen.findByRole('heading', { name: /^players$/i })).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Bravo')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('@private.test');
  });

  it('has one primary Google sign-in action and no password form', async () => {
    window.history.pushState({}, '', '/login');
    render(<App />);
    const link = await screen.findByRole('link', { name: /sign in with google/i });
    expect(link).toHaveAttribute('href', '/auth/google');
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
  });

  it('renders a useful error state if public league data cannot load', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const url = new URL(String(input), 'https://misfits.test');
      if (url.pathname === '/api/me') return response({ error: { code: 'UNAUTHENTICATED', message: 'Sign in is required.' } }, 401);
      return response({ error: { code: 'VALIDATION_ERROR', message: 'League data unavailable.' } }, 503);
    }));
    window.history.pushState({}, '', '/');
    render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/league data unavailable/i));
  });
});
