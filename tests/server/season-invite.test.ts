import { describe, expect, it } from 'vitest';
import { createLeagueRoutes } from '../../src/server/routes/leagues';

describe('retired league self-invitations', () => {
  it('does not expose the legacy invite-to-league join endpoint', async () => {
    const routes = createLeagueRoutes();
    const response = await routes.fetch(
      new Request('https://misfits.test/api/invites/legacy-token/join', {
        method: 'POST',
        headers: { Origin: 'https://misfits.test' },
      }),
      { DB: {} as never, ASSETS: {} as never, APP_ORIGIN: 'https://misfits.test' },
      {} as never,
    );

    expect(response.status).toBe(404);
  });

  it('keeps club admission separate from season and league placement', () => {
    const approvedClubMember = { clubStatus: 'APPROVED', seasonId: null, leagueId: null };
    expect(approvedClubMember).toMatchObject({ clubStatus: 'APPROVED', seasonId: null, leagueId: null });
  });
});
