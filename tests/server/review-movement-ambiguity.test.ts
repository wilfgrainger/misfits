import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/server/auth/guards', () => ({
  requireUser: async (c: any, next: () => Promise<void>) => {
    c.set('user', { id: 'caller', role: 'PLAYER', status: 'ACTIVE', club_status: 'APPROVED' });
    await next();
  },
  requireClubMember: async (_c: any, next: () => Promise<void>) => { await next(); },
}));

vi.mock('../../src/server/db/leagues', () => ({
  getLeagueByIdOrSlug: vi.fn(async () => null),
  listClubLeagues: vi.fn(async () => []),
  listLeagueMembers: vi.fn(async () => []),
  listUserLeagues: vi.fn(async () => []),
}));

vi.mock('../../src/server/db/competition', () => ({
  getCompetitionLeague: vi.fn(async () => null),
  getSeason: vi.fn(async () => ({
    id: 'season-1',
    name: '2026/27',
    status: 'OPEN',
    is_current: 1,
    created_at: '2026-08-24T12:00:00.000Z',
    updated_at: '2026-08-24T12:00:00.000Z',
    closed_at: null,
  })),
  listFixtures: vi.fn(async () => []),
  listUserSeasonHistory: vi.fn(async () => []),
}));

vi.mock('../../src/server/db/promotion', () => ({
  listUserSeasonMovements: vi.fn(async () => []),
  getPromotionPreview: vi.fn(async () => ({
    seasonId: 'season-1',
    provisional: true,
    unresolvedCount: 0,
    movements: [],
    ambiguities: [{
      leagueId: 'league-1',
      boundary: 'PROMOTION',
      position: 1,
      tiedUserIds: ['other-1', 'other-2'],
    }],
  })),
}));

import { createLeagueRoutes } from '../../src/server/routes/leagues';

class AssignedLeagueDb {
  prepare(_sql: string) {
    return {
      bind: (..._values: unknown[]) => ({
        all: async <T>() => ({ results: [{ league_id: 'league-1' } as T] }),
      }),
    };
  }
}

describe('member movement ambiguity regression', () => {
  it('does not warn a caller who is not one of the tied players', async () => {
    const routes = createLeagueRoutes();
    const env = { DB: new AssignedLeagueDb() as never, ASSETS: {} as never, APP_ORIGIN: 'https://misfits.test' };

    const response = await routes.fetch(
      new Request('https://misfits.test/api/me/seasons/season-1/movement'),
      env,
      {} as never,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ambiguity: null });
  });
});
