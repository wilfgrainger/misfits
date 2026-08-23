/** @vitest-environment jsdom */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LeagueSummary, UserSummary } from '../../src/client/api';

type Gate = { promise: Promise<void>; resolve: () => void };

function makeGate(): Gate {
  let resolve!: () => void;
  const promise = new Promise<void>((next) => { resolve = next; });
  return { promise, resolve };
}

const { state, MockApiClient } = vi.hoisted(() => {
  const firstLeague: LeagueSummary = { id: 'league-one', name: 'First Club', slug: 'first-club', seasonName: '2026', status: 'OPEN', pointsPerWin: 2, targetLegs: 3, maxPlayers: 8, matchesPerPair: 1, visibility: 'PUBLIC' };
  const secondLeague: LeagueSummary = { id: 'league-two', name: 'Second Club', slug: 'second-club', seasonName: '2026', status: 'OPEN', pointsPerWin: 2, targetLegs: 3, maxPlayers: 8, matchesPerPair: 1, visibility: 'PUBLIC' };
  const user: UserSummary = { id: 'user-one', username: 'Alpha', role: 'PLAYER', status: 'ACTIVE', profileImageUrl: null, dartsCounterUrl: null, isMasterAdmin: false };
  const shared = {
    firstLeague,
    secondLeague,
    user,
    gates: { [firstLeague.id]: makeGate(), [secondLeague.id]: makeGate() } as Record<string, Gate>,
    calls: [] as string[],
  };
  class ApiClient {
    adminLeagues() { return Promise.resolve({ leagues: [firstLeague, secondLeague] }); }
    adminPlayers() { return Promise.resolve({ players: [] }); }
    adminMembers(leagueId: string) { return this.wait(leagueId).then(() => ({ members: [] })); }
    adminInvites(leagueId: string) { return this.wait(leagueId).then(() => ({ invites: [] })); }
    adminResults(leagueId: string) {
      return this.wait(leagueId).then(() => ({ results: [{ id: leagueId, leagueId, playerAId: 'player-a', playerBId: 'player-b', playerAUsername: leagueId === firstLeague.id ? 'Stale admin' : 'Fresh admin', playerBUsername: 'Opponent', playerALegs: 3, playerBLegs: 1, playerAAverage: 60, playerBAverage: 55, submittedBy: 'player-a', status: 'CONFIRMED', confirmedBy: 'admin', disputeNote: null, createdAt: '2026-08-20T12:00:00.000Z', confirmedAt: '2026-08-20T12:00:00.000Z' }] }));
    }
    standings(leagueId: string) { return this.wait(leagueId).then(() => ({ standings: [{ rank: 1, playerId: leagueId, username: leagueId === firstLeague.id ? 'Stale player' : 'Fresh player', played: 1, won: 1, lost: 0, points: 2, average: 60 }] })); }
    results(leagueId: string) { return this.wait(leagueId).then(() => ({ results: [] })); }
    fixtures(leagueId: string) { return this.wait(leagueId).then(() => ({ fixtures: [] })); }
    publicLeague(leagueId: string) { return this.wait(leagueId).then(() => ({ league: leagueId === firstLeague.id ? firstLeague : secondLeague, players: [] })); }
    myResults() { return Promise.resolve({ results: [] }); }
    private wait(leagueId: string) { state.calls.push(leagueId); return state.gates[leagueId].promise; }
  }
  return { state: shared, MockApiClient: ApiClient };
});

vi.mock('../../src/client/api', () => ({ ApiClient: MockApiClient }));

import { PlayerLeague } from '../../src/client/components/PlayerLeague';

describe('league switch request ordering', () => {
  beforeEach(() => {
    cleanup();
    state.calls.length = 0;
    state.gates = { [state.firstLeague.id]: makeGate(), [state.secondLeague.id]: makeGate() };
  });

  it('does not let a previous league response replace the selected league data', async () => {
    const { firstLeague, secondLeague, user } = state;
    const onSignOut = vi.fn();
    const onUserSaved = vi.fn();
    const view = render(
      <PlayerLeague user={user} league={firstLeague} isParticipant onUserSaved={onUserSaved} onSignOut={onSignOut} />,
    );
    await waitFor(() => expect(state.calls).toContain(firstLeague.id));

    view.rerender(
      <PlayerLeague user={user} league={secondLeague} isParticipant onUserSaved={onUserSaved} onSignOut={onSignOut} />,
    );
    await waitFor(() => expect(state.calls).toContain(secondLeague.id));

    state.gates[secondLeague.id].resolve();
    await waitFor(() => expect(screen.getByText('Fresh player')).toBeTruthy());

    state.gates[firstLeague.id].resolve();
    await state.gates[firstLeague.id].promise;
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText('Stale player')).toBeNull();
    expect(screen.getByText('Fresh player')).toBeTruthy();
  });
});
