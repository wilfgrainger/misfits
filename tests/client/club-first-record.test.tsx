/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LeagueSummary, UserSummary } from '../../src/client/api';

vi.mock('../../src/client/components/PlayerLeague', () => ({
  PlayerLeague: ({ league, embeddedView }: { league: LeagueSummary; embeddedView: string }) => (
    <div data-testid="record-workspace">{league.name}:{embeddedView}</div>
  ),
}));

import { MemberApp } from '../../src/client/components/MemberApp';

const user: UserSummary = {
  id: 'player-a',
  username: 'Alpha',
  role: 'PLAYER',
  status: 'ACTIVE',
  clubStatus: 'APPROVED',
  profileImageUrl: null,
  dartsCounterUrl: null,
  isMasterAdmin: false,
};

const tuesday: LeagueSummary = {
  id: 'league-tuesday',
  name: 'Tuesday Club',
  slug: 'tuesday-club',
  seasonName: '2026',
  status: 'OPEN',
  maxLegs: 5,
  pointsPerWin: 2,
  pointsPerDraw: 0,
  pointsPerLoss: 0,
  targetLegs: 3,
  maxPlayers: 8,
  matchesPerPair: 1,
  visibility: 'PRIVATE',
};

const thursday: LeagueSummary = {
  ...tuesday,
  id: 'league-thursday',
  name: 'Thursday Club',
  slug: 'thursday-club',
};

const closed: LeagueSummary = {
  ...tuesday,
  id: 'league-closed',
  name: 'Winter Cup',
  slug: 'winter-cup',
  status: 'CLOSED',
};

function renderMember(myLeagues: LeagueSummary[], clubLeagues = myLeagues) {
  return render(
    <MemberApp
      user={user}
      clubLeagues={clubLeagues}
      myLeagues={myLeagues}
      onUserSaved={() => undefined}
      onSignOut={() => undefined}
    />,
  );
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('club-first Record', () => {
  it('asks which competition is being recorded when more than one open assignment is eligible', async () => {
    renderMember([tuesday, thursday]);

    fireEvent.click(screen.getByRole('button', { name: 'Record' }));
    expect(screen.getByRole('heading', { name: 'What are you recording?' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Thursday Club/ }));

    expect((await screen.findByTestId('record-workspace')).textContent).toBe('Thursday Club:record');
  });

  it('skips the competition chooser when exactly one open assignment is eligible', async () => {
    renderMember([tuesday]);

    fireEvent.click(screen.getByRole('button', { name: 'Record' }));

    expect(screen.queryByRole('heading', { name: 'What are you recording?' })).toBeNull();
    expect((await screen.findByTestId('record-workspace')).textContent).toBe('Tuesday Club:record');
  });

  it('shows a contextual empty Record state when no open assignment is eligible', () => {
    renderMember([closed], [closed]);

    fireEvent.click(screen.getByRole('button', { name: 'Record' }));

    expect(screen.getByText('No result to record here yet')).toBeTruthy();
    expect(screen.queryByTestId('record-workspace')).toBeNull();
  });

  it('surfaces opponent-submitted pending reviews and opens that competition Results view', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input).endsWith('/api/me/results')) {
        return new Response(JSON.stringify({ results: [{
          id: 'result-review',
          leagueId: tuesday.id,
          playerAId: user.id,
          playerBId: 'player-b',
          playerAUsername: user.username,
          playerBUsername: 'Bravo',
          playerALegs: 1,
          playerBLegs: 3,
          playerAAverage: 48,
          playerBAverage: 57,
          submittedBy: 'player-b',
          status: 'PENDING',
          confirmedBy: null,
          disputeNote: null,
          createdAt: '',
          confirmedAt: null,
        }] }), { status: 200 });
      }
      throw new Error(`Unexpected fetch: ${String(input)}`);
    });
    renderMember([tuesday], [tuesday]);

    const review = await screen.findByRole('button', { name: /1 result awaiting your review/ });
    fireEvent.click(review);

    expect((await screen.findByTestId('record-workspace')).textContent).toBe('Tuesday Club:results');
  });

  it('keeps current placement empty-state explicit and exposes season-linked history under More', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({
      seasons: [
        { season: { id: 'current', name: '2026/27', status: 'OPEN', isCurrent: true, createdAt: '', updatedAt: '', closedAt: null }, leagues: [tuesday], placedLeagueIds: [] },
        { season: { id: 'old', name: '2025/26', status: 'CLOSED', isCurrent: false, createdAt: '', updatedAt: '', closedAt: '' }, leagues: [closed], placedLeagueIds: ['league-closed'] },
      ],
      movements: [{ id: 'm1', fromSeasonId: 'old', toSeasonId: 'current', userId: user.id, fromLeagueId: 'league-closed', toLeagueId: 'league-tuesday', fromPosition: 1, kind: 'PROMOTED', status: 'APPLIED', toLeagueName: 'Tuesday Club', toSeasonName: '2026/27' }],
    }), { status: 200 }));
    renderMember([], [tuesday]);

    expect(screen.getByText('You are currently unassigned. A club administrator will place you before fixtures are generated.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    fireEvent.click(screen.getByRole('button', { name: 'Past seasons' }));

    expect(await screen.findByRole('heading', { name: 'Past seasons' })).toBeTruthy();
    expect(screen.getByText('Placement pending for this season. No league has been assumed.')).toBeTruthy();
    expect(screen.getByText('Confirmed movement: Tuesday Club · 2026/27 season.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Winter Cup/ }));
    expect((await screen.findByTestId('record-workspace')).textContent).toBe('Winter Cup:table');
  });
});
