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

afterEach(() => cleanup());

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
});
