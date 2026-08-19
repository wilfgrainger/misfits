// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/client/App';

function json(body: unknown, status = 200) {
  return Promise.resolve(new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }));
}

const admin = { id: 'admin', email: 'boss@example.test', username: 'Boss', role: 'ADMIN', status: 'ACTIVE' };
const player = { id: 'alice', email: 'alice@example.test', username: 'Alice', role: 'PLAYER', status: 'ACTIVE' };

function installAdminFetch(options: { role?: 'ADMIN' | 'PLAYER'; playerPatchError?: boolean } = {}) {
  const me = options.role === 'PLAYER' ? player : admin;
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'https://misfits.test');
    const method = init?.method ?? 'GET';
    if (url.pathname === '/api/me') return json({ user: me, requiresOnboarding: false });
    if (url.pathname === '/api/me/results') return json({ results: [] });
    if (url.pathname === '/api/admin/summary') return json({
      league: { id: 'misfits-501', name: 'Misfits 501', season_name: '2026', status: 'OPEN', points_per_win: 2, target_legs: 3 },
      counts: { players: 12, results: 34, pending: 2, disputed: 1, confirmed: 31 },
    });
    if (url.pathname === '/api/admin/players' && method === 'GET') return json({ players: [
      { id: 'admin', email: 'boss@example.test', username: 'Boss', role: 'ADMIN', status: 'ACTIVE', leagueActive: true, joinedAt: '2026-08-01', createdAt: '2026-08-01', lastLoginAt: '2026-08-19' },
      { id: 'alice', email: 'alice@example.test', username: 'Alice', role: 'PLAYER', status: 'ACTIVE', leagueActive: true, joinedAt: '2026-08-01', createdAt: '2026-08-01', lastLoginAt: '2026-08-19' },
    ] });
    if (url.pathname === '/api/admin/players/admin' && method === 'PATCH') {
      if (options.playerPatchError) return json({ error: { code: 'VALIDATION_ERROR', message: 'The final active administrator cannot be demoted or suspended.' } }, 409);
      return json({ player: { id: 'admin', email: 'boss@example.test', username: 'Boss', role: 'PLAYER', status: 'ACTIVE', leagueActive: true } });
    }
    if (url.pathname === '/api/admin/players/alice' && method === 'PATCH') return json({ player: { id: 'alice', email: 'alice@example.test', username: 'Alice', role: 'PLAYER', status: 'SUSPENDED', leagueActive: false } });
    if (url.pathname === '/api/admin/results' && method === 'GET') return json({ results: [{
      id: 'r1', status: 'CONFIRMED', playerAId: 'alice', playerAUsername: 'Alice', playerALegs: 3,
      playerBId: 'admin', playerBUsername: 'Boss', playerBLegs: 1, submittedBy: 'admin', confirmedBy: 'admin',
      disputeNote: null, createdAt: '2026-08-18T20:00:00Z', updatedAt: '2026-08-18T20:00:00Z', confirmedAt: '2026-08-18T20:00:00Z',
    }] });
    if (url.pathname === '/api/admin/results' && method === 'POST') return json({ result: { id: 'r2', status: 'CONFIRMED' } }, 201);
    if (url.pathname === '/api/admin/results/r1' && method === 'PATCH') return json({ result: { id: 'r1', status: 'CONFIRMED', playerALegs: 2, playerBLegs: 3 } });
    if (url.pathname === '/api/admin/results/r1' && method === 'DELETE') return json(null, 204);
    if (url.pathname === '/api/admin/league' && method === 'PATCH') return json({ league: { id: 'misfits-501', name: 'Misfits 501', season_name: 'Autumn 2026', status: 'CLOSED', points_per_win: 3, target_legs: 5 } });
    if (url.pathname === '/api/admin/audit') return json({ audit: [{ id: 7, actorUserId: 'admin', actorUsername: 'Boss', action: 'league.updated', entityType: 'league', entityId: 'misfits-501', before: {}, after: {}, createdAt: '2026-08-19T22:00:00Z' }] });
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

describe('admin experience', () => {
  it('keeps the admin area inaccessible to normal players', async () => {
    installAdminFetch({ role: 'PLAYER' });
    window.history.pushState({}, '', '/admin');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Alice' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/me');
    expect(screen.queryByRole('heading', { name: /admin dashboard/i })).not.toBeInTheDocument();
  });

  it('shows league health and admin navigation to administrators', async () => {
    installAdminFetch();
    window.history.pushState({}, '', '/admin');
    render(<App />);
    expect(await screen.findByRole('heading', { name: /admin dashboard/i })).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('34')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /players/i })).toHaveAttribute('href', '/admin/players');
    expect(screen.getByRole('link', { name: /audit/i })).toHaveAttribute('href', '/admin/audit');
  });

  it('shows private email only in admin player management and surfaces safety errors', async () => {
    installAdminFetch({ playerPatchError: true });
    window.history.pushState({}, '', '/admin/players');
    render(<App />);
    expect(await screen.findByText('alice@example.test')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/role for boss/i), { target: { value: 'PLAYER' } });
    fireEvent.click(screen.getByRole('button', { name: /save boss/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/final active administrator/i);
  });

  it('supports manual result entry and explicit delete confirmation', async () => {
    const fetchMock = installAdminFetch();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    window.history.pushState({}, '', '/admin/results');
    render(<App />);
    expect(await screen.findByText(/alice/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /delete result/i }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([input, init]) => String(input) === '/api/admin/results/r1' && init?.method === 'DELETE')).toBe(true));
    expect(window.confirm).toHaveBeenCalled();
  });

  it('updates league settings without exposing raw database fields to the form', async () => {
    const fetchMock = installAdminFetch();
    window.history.pushState({}, '', '/admin/league');
    render(<App />);
    const season = await screen.findByLabelText(/season name/i);
    fireEvent.change(season, { target: { value: 'Autumn 2026' } });
    fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'CLOSED' } });
    fireEvent.change(screen.getByLabelText(/points per win/i), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/target legs/i), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /save league/i }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([input, init]) => String(input) === '/api/admin/league' && init?.method === 'PATCH')).toBe(true));
  });

  it('renders readable audit history', async () => {
    installAdminFetch();
    window.history.pushState({}, '', '/admin/audit');
    render(<App />);
    expect(await screen.findByText('league.updated')).toBeInTheDocument();
    expect(screen.getByText('Boss')).toBeInTheDocument();
  });
});
