/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerLeague } from '../../src/client/components/PlayerLeague';
import type { LeagueSummary, UserSummary } from '../../src/client/api';

const league: LeagueSummary = { id: 'league-1', name: 'Misfits 501', slug: 'misfits-501', seasonName: '2026', status: 'OPEN', pointsPerWin: 2, targetLegs: 3, maxPlayers: 16, matchesPerPair: 1, visibility: 'PUBLIC' };
const user: UserSummary = { id: 'player-a', username: 'Alpha', role: 'PLAYER', status: 'ACTIVE', profileImageUrl: null, dartsCounterUrl: null, isMasterAdmin: false };
const players = [{ id: 'player-a', username: 'Alpha', profileImageUrl: null }, { id: 'player-b', username: 'Bravo', profileImageUrl: null }];

function renderParticipant(currentLeague = league, onUserSaved = vi.fn()) {
  return render(
    <PlayerLeague
      user={user}
      league={currentLeague}
      isParticipant
      onUserSaved={onUserSaved}
      onSignOut={vi.fn()}
    />,
  );
}

function installReadApi({
  currentLeague = league,
  standings = [],
  results = [],
  myResults = [],
  fixtures = [],
  leaguePlayers = players,
}: {
  currentLeague?: LeagueSummary;
  standings?: unknown[];
  results?: unknown[];
  myResults?: unknown[];
  fixtures?: unknown[];
  leaguePlayers?: typeof players;
} = {}) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = String(input);
    if (path.endsWith(`/api/public/leagues/${currentLeague.id}/standings`)) return new Response(JSON.stringify({ standings }), { status: 200 });
    if (path.endsWith(`/api/public/leagues/${currentLeague.id}/results`)) return new Response(JSON.stringify({ results }), { status: 200 });
    if (path.endsWith(`/api/public/leagues/${currentLeague.id}`)) return new Response(JSON.stringify({ league: currentLeague, players: leaguePlayers }), { status: 200 });
    if (path.endsWith('/api/me/results')) return new Response(JSON.stringify({ results: myResults }), { status: 200 });
    if (path.endsWith(`/api/admin/competition/leagues/${currentLeague.id}/fixtures`)) return new Response(JSON.stringify({ fixtures }), { status: 200 });
    if (path.endsWith(`/api/leagues/${currentLeague.id}/fixtures`)) return new Response(JSON.stringify({ fixtures }), { status: 200 });
    if (path.endsWith(`/api/me/leagues/${currentLeague.id}/fixtures`)) return new Response(JSON.stringify({ fixtures }), { status: 200 });
    throw new Error(`Unexpected fetch: ${path}`);
  });
}

describe('mobile league workspaces', () => {
  beforeEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('renders exactly the signed-in member navigation and puts profile access through More', async () => {
    installReadApi({ standings: [{ rank: 1, playerId: 'player-a', username: 'Alpha', played: 1, won: 1, lost: 0, legsFor: 3, legsAgainst: 1, legDifference: 2, points: 2, average: 51.24 }] });
    renderParticipant();

    await screen.findByRole('rowheader', { name: 'Alpha' });
    const nav = screen.getByRole('navigation', { name: 'Member workspace' });
    expect(Array.from(nav.querySelectorAll('button')).map((button) => button.textContent)).toEqual(['League', 'Record', 'Results', 'More']);
    expect(screen.queryByRole('button', { name: 'Fixtures' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    expect(screen.getByRole('button', { name: 'Players' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Profile' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy();
  });

  it('marks the signed-in player in the accessible member standings table', async () => {
    installReadApi({ standings: [{ rank: 1, playerId: 'player-a', username: 'Alpha', played: 1, won: 1, lost: 0, legsFor: 3, legsAgainst: 1, legDifference: 2, points: 2, average: 51.24 }] });
    renderParticipant();

    const table = await screen.findByRole('table', { name: 'Misfits 501 2026 standings' });
    expect(table.querySelector('tr.standing-row-you')?.textContent).toContain('Alpha');
  });

  it('submits a player result only for a published fixture', async () => {
    const fixturePayload = { fixtures: [{ id: 'f1', seasonId: 's1', leagueId: 'league-1', playerAId: 'player-a', playerBId: 'player-b', pairKey: 'player-a:player-b', round: 1, meetingNumber: 1, status: 'OUTSTANDING', createdAt: '2026-08-20T00:00:00.000Z', updatedAt: '2026-08-20T00:00:00.000Z', voidedAt: null, playerAUsername: 'Alpha', playerBUsername: 'Bravo', resultId: null }] };
    const resultPayload = { result: { id: 'result-1', fixtureId: 'f1', leagueId: 'league-1', playerAId: 'player-a', playerBId: 'player-b', playerAUsername: 'Alpha', playerBUsername: 'Bravo', playerALegs: 3, playerBLegs: 1, playerAAverage: 61.2, playerBAverage: 55.5, submittedBy: 'player-a', status: 'PENDING', confirmedBy: null, disputeNote: null, createdAt: '2026-08-20T12:00:00.000Z', confirmedAt: null } };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const path = String(input);
      if (path.endsWith('/api/public/leagues/league-1/standings')) return new Response(JSON.stringify({ standings: [] }), { status: 200 });
      if (path.endsWith('/api/public/leagues/league-1/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      if (path.endsWith('/api/public/leagues/league-1')) return new Response(JSON.stringify({ league, players }), { status: 200 });
      if (path.endsWith('/api/me/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      if (path.endsWith('/api/admin/competition/leagues/league-1/fixtures')) return new Response(JSON.stringify(fixturePayload), { status: 200 });
      if (path.endsWith('/api/leagues/league-1/fixtures')) return new Response(JSON.stringify(fixturePayload), { status: 200 });
      if (path.endsWith('/api/me/leagues/league-1/fixtures')) return new Response(JSON.stringify(fixturePayload), { status: 200 });
      if (path.endsWith('/api/leagues/league-1/results') && init?.method === 'POST') return new Response(JSON.stringify(resultPayload), { status: 201 });
      throw new Error(`Unexpected fetch: ${path}`);
    });

    renderParticipant();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Misfits 501' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Record' }));
    expect(screen.queryByLabelText('Opponent')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Record this fixture' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Record your result' })).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Your legs'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Their legs'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Your average'), { target: { value: '61.2' } });
    fireEvent.change(screen.getByLabelText('Their average'), { target: { value: '55.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send for confirmation' }));

    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Result sent to your opponent.'));
    const resultCall = fetchMock.mock.calls.find(([input, init]) => String(input).endsWith('/api/leagues/league-1/results') && init?.method === 'POST');
    expect(resultCall).toBeTruthy();
    expect(JSON.parse(String(resultCall?.[1]?.body))).toEqual({ fixtureId: 'f1', playerALegs: 3, playerBLegs: 1, playerAAverage: 61.2, playerBAverage: 55.5 });
  });

  it('maps Your and Their values back to the persisted fixture sides when the player is fixture B', async () => {
    const playerB: UserSummary = { id: 'player-b', username: 'Bravo', role: 'PLAYER', status: 'ACTIVE', clubStatus: 'APPROVED', profileImageUrl: null, dartsCounterUrl: null, isMasterAdmin: false };
    const fixturePayload = { fixtures: [{ id: 'f-b', seasonId: 's1', leagueId: 'league-1', playerAId: 'player-a', playerBId: 'player-b', pairKey: 'player-a:player-b', round: 1, meetingNumber: 1, status: 'OUTSTANDING', createdAt: '2026-08-20T00:00:00.000Z', updatedAt: '2026-08-20T00:00:00.000Z', voidedAt: null, playerAUsername: 'Alpha', playerBUsername: 'Bravo', resultId: null }] };
    const resultPayload = { result: { id: 'result-b', fixtureId: 'f-b', leagueId: 'league-1', playerAId: 'player-a', playerBId: 'player-b', playerAUsername: 'Alpha', playerBUsername: 'Bravo', playerALegs: 1, playerBLegs: 3, playerAAverage: 48.2, playerBAverage: 62.4, submittedBy: 'player-b', status: 'PENDING', confirmedBy: null, disputeNote: null, createdAt: '2026-08-20T12:00:00.000Z', confirmedAt: null } };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const path = String(input);
      if (path.endsWith('/api/public/leagues/league-1/standings')) return new Response(JSON.stringify({ standings: [] }), { status: 200 });
      if (path.endsWith('/api/public/leagues/league-1/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      if (path.endsWith('/api/public/leagues/league-1')) return new Response(JSON.stringify({ league, players }), { status: 200 });
      if (path.endsWith('/api/me/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      if (path.endsWith('/api/leagues/league-1/fixtures')) return new Response(JSON.stringify(fixturePayload), { status: 200 });
      if (path.endsWith('/api/me/leagues/league-1/fixtures')) return new Response(JSON.stringify(fixturePayload), { status: 200 });
      if (path.endsWith('/api/leagues/league-1/results') && init?.method === 'POST') return new Response(JSON.stringify(resultPayload), { status: 201 });
      throw new Error(`Unexpected fetch: ${path}`);
    });

    render(<PlayerLeague user={playerB} league={league} isParticipant onUserSaved={vi.fn()} onSignOut={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Misfits 501' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Record' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Record this fixture' }));
    fireEvent.change(screen.getByLabelText('Your legs'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Their legs'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Your average'), { target: { value: '62.4' } });
    fireEvent.change(screen.getByLabelText('Their average'), { target: { value: '48.2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send for confirmation' }));

    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Result sent to your opponent.'));
    const resultCall = fetchMock.mock.calls.find(([input, init]) => String(input).endsWith('/api/leagues/league-1/results') && init?.method === 'POST');
    expect(JSON.parse(String(resultCall?.[1]?.body))).toEqual({ fixtureId: 'f-b', playerALegs: 1, playerBLegs: 3, playerAAverage: 48.2, playerBAverage: 62.4 });
  });

  it('keeps result-dispute focus inside a named dialog and restores its opener', async () => {
    const pendingResult = { id: 'result-1', leagueId: 'league-1', playerAId: 'player-a', playerBId: 'player-b', playerAUsername: 'Alpha', playerBUsername: 'Bravo', playerALegs: 3, playerBLegs: 1, playerAAverage: 51.24, playerBAverage: 47.1, submittedBy: 'player-b', status: 'PENDING', confirmedBy: null, disputeNote: null, createdAt: '2026-08-20T12:00:00.000Z', confirmedAt: null };
    installReadApi({ myResults: [pendingResult] });
    renderParticipant();

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

  it('shows a submitted pending result without offering self-confirmation', async () => {
    const pendingResult = { id: 'result-1', leagueId: 'league-1', playerAId: 'player-a', playerBId: 'player-b', playerAUsername: 'Alpha', playerBUsername: 'Bravo', playerALegs: 3, playerBLegs: 1, playerAAverage: 51.24, playerBAverage: 47.1, submittedBy: 'player-a', status: 'PENDING', confirmedBy: null, disputeNote: null, createdAt: '2026-08-20T12:00:00.000Z', confirmedAt: null };
    installReadApi({ myResults: [pendingResult] });
    renderParticipant();

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Misfits 501' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Results' }));

    expect(await screen.findByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Bravo')).toBeTruthy();
    expect(screen.getByText('PENDING')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Dispute' })).toBeNull();
  });

  it('saves the signed-in player profile through the More panel', async () => {
    const onUserSaved = vi.fn();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const path = String(input);
      if (path.endsWith('/api/public/leagues/league-1/standings')) return new Response(JSON.stringify({ standings: [] }), { status: 200 });
      if (path.endsWith('/api/public/leagues/league-1/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      if (path.endsWith('/api/public/leagues/league-1')) return new Response(JSON.stringify({ league, players }), { status: 200 });
      if (path.endsWith('/api/me/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      if (path.endsWith('/api/admin/competition/leagues/league-1/fixtures')) return new Response(JSON.stringify({ fixtures: [] }), { status: 200 });
      if (path.endsWith('/api/leagues/league-1/fixtures')) return new Response(JSON.stringify({ fixtures: [] }), { status: 200 });
      if (path.endsWith('/api/me/leagues/league-1/fixtures')) return new Response(JSON.stringify({ fixtures: [] }), { status: 200 });
      if (path.endsWith('/api/me/profile') && init?.method === 'PATCH') return new Response(JSON.stringify({ profile: { ...user, username: 'Alpha Prime', dartsCounterUrl: 'https://dartcounter.net/alpha', profileImageUrl: null } }), { status: 200 });
      throw new Error(`Unexpected fetch: ${path}`);
    });

    renderParticipant(league, onUserSaved);
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
      if (path.includes('/api/admin/competition/leagues/') && path.endsWith('/fixtures')) return new Response(JSON.stringify({ fixtures: [{ id: current.id === 'league-2' ? 'f2' : 'f1', seasonId: 's1', leagueId: current.id, playerAId: 'player-a', playerBId: current.id === 'league-2' ? 'player-c' : 'player-b', pairKey: `player-a:${current.id === 'league-2' ? 'player-c' : 'player-b'}`, round: 1, meetingNumber: 1, status: 'OUTSTANDING', createdAt: '2026-08-20T00:00:00.000Z', updatedAt: '2026-08-20T00:00:00.000Z', voidedAt: null, playerAUsername: 'Alpha', playerBUsername: current.id === 'league-2' ? 'Charlie' : 'Bravo', resultId: null }] }), { status: 200 });
      if (path.includes('/api/leagues/') && path.endsWith('/fixtures')) return new Response(JSON.stringify({ fixtures: [{ id: current.id === 'league-2' ? 'f2' : 'f1', seasonId: 's1', leagueId: current.id, playerAId: 'player-a', playerBId: current.id === 'league-2' ? 'player-c' : 'player-b', pairKey: `player-a:${current.id === 'league-2' ? 'player-c' : 'player-b'}`, round: 1, meetingNumber: 1, status: 'OUTSTANDING', createdAt: '2026-08-20T00:00:00.000Z', updatedAt: '2026-08-20T00:00:00.000Z', voidedAt: null, playerAUsername: 'Alpha', playerBUsername: current.id === 'league-2' ? 'Charlie' : 'Bravo', resultId: null }] }), { status: 200 });
      if (path.includes('/api/me/leagues/') && path.endsWith('/fixtures')) return new Response(JSON.stringify({ fixtures: [{ id: current.id === 'league-2' ? 'f2' : 'f1', seasonId: 's1', leagueId: current.id, playerAId: 'player-a', playerBId: current.id === 'league-2' ? 'player-c' : 'player-b', pairKey: `player-a:${current.id === 'league-2' ? 'player-c' : 'player-b'}`, round: 1, meetingNumber: 1, status: 'OUTSTANDING', createdAt: '2026-08-20T00:00:00.000Z', updatedAt: '2026-08-20T00:00:00.000Z', voidedAt: null, playerAUsername: 'Alpha', playerBUsername: current.id === 'league-2' ? 'Charlie' : 'Bravo', resultId: null }] }), { status: 200 });
      throw new Error(`Unexpected fetch: ${path}`);
    });

    const onUserSaved = vi.fn();
    const onSignOut = vi.fn();
    const { rerender } = render(<PlayerLeague user={user} league={league} isParticipant onUserSaved={onUserSaved} onSignOut={onSignOut} />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Misfits 501' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Record' }));
    await waitFor(() => expect(screen.getByText('Alpha vs Bravo')).toBeTruthy());

    rerender(<PlayerLeague user={user} league={secondLeague} isParticipant onUserSaved={onUserSaved} onSignOut={onSignOut} />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Thursday Club' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Record' }));
    await waitFor(() => expect(screen.getByText('Alpha vs Charlie')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Record this fixture' }));
    expect((screen.getByLabelText('Your legs') as HTMLInputElement).value).toBe('');
  });

  it('keeps fixture selection inside Record and submits the selected fixture result', async () => {
    const fixturePayload = { fixtures: [{ id: 'f1', seasonId: 's1', leagueId: 'league-1', playerAId: 'player-a', playerBId: 'player-b', pairKey: 'player-a:player-b', round: 1, meetingNumber: 1, status: 'OUTSTANDING', createdAt: '2026-08-20T00:00:00.000Z', updatedAt: '2026-08-20T00:00:00.000Z', voidedAt: null, playerAUsername: 'Alpha', playerBUsername: 'Bravo', resultId: null }] };
    const resultPayload = { result: { id: 'r1', fixtureId: 'f1', leagueId: 'league-1', playerAId: 'player-a', playerBId: 'player-b', playerAUsername: 'Alpha', playerBUsername: 'Bravo', playerALegs: 3, playerBLegs: 1, playerAAverage: 60.5, playerBAverage: 52.0, submittedBy: 'player-a', status: 'PENDING', confirmedBy: null, disputeNote: null, createdAt: '2026-08-20T12:00:00.000Z', confirmedAt: null } };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const path = String(input);
      if (path.endsWith('/api/public/leagues/league-1/standings')) return new Response(JSON.stringify({ standings: [] }), { status: 200 });
      if (path.endsWith('/api/public/leagues/league-1/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      if (path.endsWith('/api/public/leagues/league-1')) return new Response(JSON.stringify({ league, players }), { status: 200 });
      if (path.endsWith('/api/me/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      if (path.endsWith('/api/admin/competition/leagues/league-1/fixtures')) return new Response(JSON.stringify(fixturePayload), { status: 200 });
      if (path.endsWith('/api/leagues/league-1/fixtures')) return new Response(JSON.stringify(fixturePayload), { status: 200 });
      if (path.endsWith('/api/me/leagues/league-1/fixtures')) return new Response(JSON.stringify(fixturePayload), { status: 200 });
      if (path.endsWith('/api/leagues/league-1/results') && init?.method === 'POST') return new Response(JSON.stringify(resultPayload), { status: 201 });
      throw new Error(`Unexpected fetch: ${path}`);
    });

    renderParticipant();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Misfits 501' })).toBeTruthy());
    expect(screen.queryByRole('button', { name: 'Fixtures' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Record' }));
    await waitFor(() => expect(screen.getByText(/Alpha vs Bravo/)).toBeTruthy());
    expect(screen.getByText(/Round 1/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Record this fixture' }));
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

  it('shows pending and disputed fixture context in the league progress board', async () => {
    const fixtures = [
      { id: 'pending', seasonId: 's1', leagueId: 'league-1', playerAId: 'player-a', playerBId: 'player-b', pairKey: 'player-a:player-b', round: 1, meetingNumber: 1, status: 'PENDING_CONFIRMATION', createdAt: '2026-08-20T00:00:00.000Z', updatedAt: '2026-08-20T00:00:00.000Z', voidedAt: null, playerAUsername: 'Alpha', playerBUsername: 'Bravo', resultId: 'r1', resultStatus: 'PENDING', playerALegs: 3, playerBLegs: 1, playerAAverage: 61.2, playerBAverage: 55.5, submittedBy: 'player-a', disputeNote: null, confirmedAt: null },
      { id: 'disputed', seasonId: 's1', leagueId: 'league-1', playerAId: 'player-a', playerBId: 'player-c', pairKey: 'player-a:player-c', round: 2, meetingNumber: 1, status: 'DISPUTED', createdAt: '2026-08-20T00:00:00.000Z', updatedAt: '2026-08-20T00:00:00.000Z', voidedAt: null, playerAUsername: 'Alpha', playerBUsername: 'Charlie', resultId: 'r2', resultStatus: 'DISPUTED', playerALegs: 2, playerBLegs: 3, playerAAverage: 49.8, playerBAverage: 58.1, submittedBy: 'player-a', disputeNote: 'Check the leg count', confirmedAt: null },
      { id: 'void', seasonId: 's1', leagueId: 'league-1', playerAId: 'player-b', playerBId: 'player-c', pairKey: 'player-b:player-c', round: 3, meetingNumber: 1, status: 'VOID', createdAt: '2026-08-20T00:00:00.000Z', updatedAt: '2026-08-20T00:00:00.000Z', voidedAt: '2026-08-21T00:00:00.000Z', playerAUsername: 'Bravo', playerBUsername: 'Charlie', resultId: null, resultStatus: null, playerALegs: null, playerBLegs: null, playerAAverage: null, playerBAverage: null, submittedBy: null, disputeNote: null, confirmedAt: null },
    ];
    installReadApi({ fixtures });
    render(<PlayerLeague user={user} league={league} isParticipant onUserSaved={vi.fn()} onSignOut={vi.fn()} embedded embeddedView="fixtures" />);

    expect(await screen.findByText(/Your progress: 0 confirmed of 2 active fixtures · 0 outstanding · 1 pending · 1 disputed · 1 void/)).toBeTruthy();
    expect(screen.getByText(/Submitted score: 3-1 · 61.20 \/ 55.50 avg. Waiting for your opponent to confirm\./)).toBeTruthy();
    expect(screen.getByText(/Submitted score: 2-3 · 49.80 \/ 58.10 avg. Disputed: Check the leg count/)).toBeTruthy();
    expect(screen.getByText('Void fixture; it does not affect the table and cannot receive a result.')).toBeTruthy();
  });

  it('makes result entry unavailable when the league is closed', async () => {
    const closedLeague: LeagueSummary = { ...league, status: 'CLOSED' };
    installReadApi({ currentLeague: closedLeague });
    renderParticipant(closedLeague);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Misfits 501' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Record' }));
    expect(screen.getByText('Result entry is unavailable while this league is closed.')).toBeTruthy();
    expect(screen.getByText('No fixtures have been published for this league yet.')).toBeTruthy();
    expect(screen.queryByLabelText('Opponent')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Send for confirmation' })).toBeNull();
  });
});
