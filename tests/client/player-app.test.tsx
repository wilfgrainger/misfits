/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerLeague } from '../../src/client/components/PlayerLeague';
import type { LeagueSummary, UserSummary } from '../../src/client/api';

const league: LeagueSummary = { id: 'league-1', name: 'Misfits 501', slug: 'misfits-501', seasonName: '2026', status: 'OPEN', pointsPerWin: 2, targetLegs: 3, maxPlayers: 16, matchesPerPair: 1, visibility: 'PUBLIC' };
const user: UserSummary = { id: 'player-a', username: 'Alpha', role: 'PLAYER', status: 'ACTIVE', profileImageUrl: null, dartsCounterUrl: null, isMasterAdmin: false };

describe('mobile league workspaces', () => {
  beforeEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('renders a signed-in player table with app navigation and profile access through More', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ standings: [{ rank: 1, playerId: 'player-a', username: 'Alpha', played: 1, won: 1, lost: 0, legsFor: 3, legsAgainst: 1, legDifference: 2, points: 2, average: 51.24 }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ league, players: [{ id: 'player-a', username: 'Alpha', profileImageUrl: null }, { id: 'player-b', username: 'Bravo', profileImageUrl: null }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [] }), { status: 200 }));

    render(<PlayerLeague user={user} league={league} onUserSaved={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
    expect(screen.getByRole('navigation', { name: 'Member workspace' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'League' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Results' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Record' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'More' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Fixtures' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    expect(screen.getByRole('button', { name: 'Profile' })).toBeTruthy();
  });

  it('marks the signed-in player in the accessible member standings table', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ standings: [{ rank: 1, playerId: 'player-a', username: 'Alpha', played: 1, won: 1, lost: 0, legsFor: 3, legsAgainst: 1, legDifference: 2, points: 2, average: 51.24 }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ league, players: [{ id: 'player-a', username: 'Alpha', profileImageUrl: null }, { id: 'player-b', username: 'Bravo', profileImageUrl: null }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [] }), { status: 200 }));

    render(<PlayerLeague user={user} league={league} onUserSaved={vi.fn()} />);
    const table = await screen.findByRole('table', { name: 'Misfits 501 2026 standings' });
    expect(table.querySelector('tr.standing-row-you')?.textContent).toContain('Alpha');
  });

  it('submits a player result with both players and averages', async () => {
    const resultPayload = { result: { id: 'result-1', leagueId: 'league-1', playerAId: 'player-a', playerBId: 'player-b', playerAUsername: 'Alpha', playerBUsername: 'Bravo', playerALegs: 3, playerBLegs: 1, playerAAverage: 61.2, playerBAverage: 55.5, submittedBy: 'player-a', status: 'PENDING', confirmedBy: null, disputeNote: null, createdAt: '2026-08-20T12:00:00.000Z', confirmedAt: null } };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const path = String(input);
      if (path.endsWith('/api/public/leagues/league-1/standings')) return new Response(JSON.stringify({ standings: [] }), { status: 200 });
      if (path.endsWith('/api/public/leagues/league-1/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      if (path.endsWith('/api/public/leagues/league-1')) return new Response(JSON.stringify({ league, players: [{ id: 'player-a', username: 'Alpha', profileImageUrl: null }, { id: 'player-b', username: 'Bravo', profileImageUrl: null }] }), { status: 200 });
      if (path.endsWith('/api/me/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      if (path.endsWith('/api/leagues/league-1/results') && init?.method === 'POST') return new Response(JSON.stringify(resultPayload), { status: 201 });
      throw new Error(`Unexpected fetch: ${path}`);
    });

    render(<PlayerLeague user={user} league={league} onUserSaved={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Misfits 501' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Record' }));
    await waitFor(() => expect((screen.getByLabelText('Opponent') as HTMLSelectElement).value).toBe('player-b'));
    fireEvent.change(screen.getByLabelText('Your legs'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Their legs'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Your average'), { target: { value: '61.2' } });
    fireEvent.change(screen.getByLabelText('Their average'), { target: { value: '55.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send for confirmation' }));

    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Result sent to your opponent.'));
    const resultCall = fetchMock.mock.calls.find(([input, init]) => String(input).endsWith('/api/leagues/league-1/results') && init?.method === 'POST');
    expect(resultCall).toBeTruthy();
    expect(JSON.parse(String(resultCall?.[1]?.body))).toEqual({ playerAId: 'player-a', playerBId: 'player-b', playerALegs: 3, playerBLegs: 1, playerAAverage: 61.2, playerBAverage: 55.5 });
  });

  it('keeps result-dispute focus inside a named dialog and restores its opener', async () => {
    const pendingResult = { id: 'result-1', leagueId: 'league-1', playerAId: 'player-a', playerBId: 'player-b', playerAUsername: 'Alpha', playerBUsername: 'Bravo', playerALegs: 3, playerBLegs: 1, playerAAverage: 51.24, playerBAverage: 47.1, submittedBy: 'player-b', status: 'PENDING', confirmedBy: null, disputeNote: null, createdAt: '2026-08-20T12:00:00.000Z', confirmedAt: null };
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const path = String(input);
      if (path.endsWith('/api/public/leagues/league-1/standings')) return new Response(JSON.stringify({ standings: [] }), { status: 200 });
      if (path.endsWith('/api/public/leagues/league-1/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      if (path.endsWith('/api/public/leagues/league-1')) return new Response(JSON.stringify({ league, players: [{ id: 'player-a', username: 'Alpha', profileImageUrl: null }, { id: 'player-b', username: 'Bravo', profileImageUrl: null }] }), { status: 200 });
      if (path.endsWith('/api/me/results')) return new Response(JSON.stringify({ results: [pendingResult] }), { status: 200 });
      throw new Error(`Unexpected fetch: ${path}`);
    });

    render(<PlayerLeague user={user} league={league} onUserSaved={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Misfits 501' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Results' }));
    const dispute = await screen.findByRole('button', { name: 'Dispute' });
    fireEvent.click(dispute);

    expect(screen.getByRole('dialog', { name: 'Dispute result' })).toBeTruthy();
    const note = screen.getByLabelText('What needs checking?');
    expect(document.activeElement).toBe(note);
    fireEvent.keyDown(note, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Send dispute' }));
    fireEvent.keyDown(screen.getByRole('button', { name: 'Send dispute' }), { key: 'Tab' });
    expect(document.activeElement).toBe(note);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(dispute);
  });

  it('saves the signed-in player profile through the More panel', async () => {
    const onUserSaved = vi.fn();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const path = String(input);
      if (path.endsWith('/api/public/leagues/league-1/standings')) return new Response(JSON.stringify({ standings: [] }), { status: 200 });
      if (path.endsWith('/api/public/leagues/league-1/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      if (path.endsWith('/api/public/leagues/league-1')) return new Response(JSON.stringify({ league, players: [{ id: 'player-a', username: 'Alpha', profileImageUrl: null }, { id: 'player-b', username: 'Bravo', profileImageUrl: null }] }), { status: 200 });
      if (path.endsWith('/api/me/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      if (path.endsWith('/api/me/profile') && init?.method === 'PATCH') return new Response(JSON.stringify({ profile: { ...user, username: 'Alpha Prime', dartsCounterUrl: 'https://dartcounter.net/alpha', profileImageUrl: null } }), { status: 200 });
      throw new Error(`Unexpected fetch: ${path}`);
    });

    render(<PlayerLeague user={user} league={league} onUserSaved={onUserSaved} />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Misfits 501' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    fireEvent.click(screen.getByRole('button', { name: 'Profile' }));
    fireEvent.change(screen.getByLabelText('Nickname'), { target: { value: 'Alpha Prime' } });
    fireEvent.change(screen.getByLabelText('Darts Counter profile'), { target: { value: 'https://dartcounter.net/alpha' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Profile saved.'));
    const profileCall = fetchMock.mock.calls.find(([input, init]) => String(input).endsWith('/api/me/profile') && init?.method === 'PATCH');
    expect(profileCall).toBeTruthy();
    expect(JSON.parse(String(profileCall?.[1]?.body))).toEqual({ username: 'Alpha Prime', dartsCounterUrl: 'https://dartcounter.net/alpha' });
    expect(onUserSaved).toHaveBeenCalledWith({ ...user, username: 'Alpha Prime', dartsCounterUrl: 'https://dartcounter.net/alpha', profileImageUrl: null });
  });

  it('resets the result form when switching to another league', async () => {
    const secondLeague: LeagueSummary = { ...league, id: 'league-2', name: 'Thursday Club', slug: 'thursday-club', targetLegs: 5 };
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const path = String(input);
      const current = path.includes('league-2') ? secondLeague : league;
      if (path.includes('/standings')) return new Response(JSON.stringify({ standings: [] }), { status: 200 });
      if (path.includes('/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      if (path.includes('/api/public/leagues/')) return new Response(JSON.stringify({ league: current, players: [{ id: user.id, username: 'Alpha', profileImageUrl: null }, { id: current.id === 'league-2' ? 'player-c' : 'player-b', username: current.id === 'league-2' ? 'Charlie' : 'Bravo', profileImageUrl: null }] }), { status: 200 });
      if (path.endsWith('/api/me/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      throw new Error(`Unexpected fetch: ${path}`);
    });

    const { rerender } = render(<PlayerLeague user={user} league={league} onUserSaved={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Misfits 501' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Record' }));
    await waitFor(() => expect((screen.getByLabelText('Opponent') as HTMLSelectElement).value).toBe('player-b'));

    rerender(<PlayerLeague user={user} league={secondLeague} onUserSaved={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Thursday Club' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Record' }));
    await waitFor(() => expect((screen.getByLabelText('Opponent') as HTMLSelectElement).value).toBe('player-c'));
    expect((screen.getByLabelText('Your legs') as HTMLInputElement).value).toBe('');
  });

  it('advertises fixtures only when fixture capability actually loaded and submits fixture results', async () => {
    const fixturePayload = { fixtures: [{ id: 'f1', seasonId: 's1', leagueId: 'league-1', playerAId: 'player-a', playerBId: 'player-b', pairKey: 'player-a:player-b', round: 1, meetingNumber: 1, status: 'OUTSTANDING', createdAt: '2026-08-20T00:00:00.000Z', updatedAt: '2026-08-20T00:00:00.000Z', voidedAt: null, playerAUsername: 'Alpha', playerBUsername: 'Bravo', resultId: null }] };
    const resultPayload = { result: { id: 'r1', fixtureId: 'f1', leagueId: 'league-1', playerAId: 'player-a', playerBId: 'player-b', playerAUsername: 'Alpha', playerBUsername: 'Bravo', playerALegs: 3, playerBLegs: 1, playerAAverage: 60.5, playerBAverage: 52.0, submittedBy: 'player-a', status: 'PENDING', confirmedBy: null, disputeNote: null, createdAt: '2026-08-20T12:00:00.000Z', confirmedAt: null } };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const path = String(input);
      if (path.includes('/standings')) return new Response(JSON.stringify({ standings: [] }), { status: 200 });
      if (path.includes('/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      if (path.includes('/api/public/leagues/')) return new Response(JSON.stringify({ league, players: [{ id: user.id, username: 'Alpha', profileImageUrl: null }, { id: 'player-b', username: 'Bravo', profileImageUrl: null }] }), { status: 200 });
      if (path.endsWith('/api/me/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      if (path.includes('/api/admin/competition/leagues/league-1/fixtures')) return new Response(JSON.stringify(fixturePayload), { status: 200 });
      if (path.endsWith('/api/leagues/league-1/results') && init?.method === 'POST') return new Response(JSON.stringify(resultPayload), { status: 201 });
      throw new Error(`Unexpected fetch: ${path}`);
    });

    render(<PlayerLeague user={user} league={league} onUserSaved={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Fixtures' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Fixtures' }));
    await waitFor(() => expect(screen.getByText(/Alpha vs Bravo/)).toBeTruthy());
    expect(screen.getByText(/Round 1/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Record result' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Record your result' })).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Your legs'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Their legs'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Your average'), { target: { value: '60.5' } });
    fireEvent.change(screen.getByLabelText('Their average'), { target: { value: '52.0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send for confirmation' }));

    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Result sent to your opponent.'));
    const resultCall = fetchMock.mock.calls.find(([input, init]) => String(input).endsWith('/api/leagues/league-1/results') && init?.method === 'POST');
    expect(resultCall).toBeTruthy();
    expect(JSON.parse(String(resultCall?.[1]?.body))).toEqual({ fixtureId: 'f1', playerALegs: 3, playerBLegs: 1, playerAAverage: 60.5, playerBAverage: 52 });
  });

  it('makes result entry unavailable when the league is closed', async () => {
    const closedLeague: LeagueSummary = { ...league, status: 'CLOSED' };
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const path = String(input);
      if (path.includes('/standings')) return new Response(JSON.stringify({ standings: [] }), { status: 200 });
      if (path.includes('/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      if (path.includes('/api/public/leagues/')) return new Response(JSON.stringify({ league: closedLeague, players: [{ id: user.id, username: 'Alpha', profileImageUrl: null }, { id: 'player-b', username: 'Bravo', profileImageUrl: null }] }), { status: 200 });
      if (path.endsWith('/api/me/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      throw new Error(`Unexpected fetch: ${path}`);
    });

    render(<PlayerLeague user={user} league={closedLeague} onUserSaved={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Misfits 501' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Record' }));
    expect(screen.getByText('Result entry is unavailable while this league is closed.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'League closed' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
