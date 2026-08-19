import { Hono } from 'hono';
import type { Env } from '../env';
import type { AppVariables } from '../auth/guards';
import { getLeague, listActiveLeaguePlayers, listPublicPlayers } from '../db/leagues';
import { listConfirmedMatches, listConfirmedMatchesForStandings } from '../db/matches';
import { calculateStandings } from '../domain/standings';

type AppEnv = { Bindings: Env; Variables: AppVariables };

function publicCache(c: { header(name: string, value: string): void }) {
  c.header('Cache-Control', 'public, max-age=0, must-revalidate');
}

export function createPublicRoutes() {
  const routes = new Hono<AppEnv>();

  routes.get('/api/public/league', async (c) => {
    const league = await getLeague(c.env.DB);
    const [players, matches] = await Promise.all([
      listActiveLeaguePlayers(c.env.DB, league.id),
      listConfirmedMatchesForStandings(c.env.DB, league.id),
    ]);
    publicCache(c);
    return c.json({
      league: {
        id: league.id,
        name: league.name,
        slug: league.slug,
        seasonName: league.season_name,
        status: league.status,
        pointsPerWin: league.points_per_win,
        targetLegs: league.target_legs,
      },
      standings: calculateStandings(players, matches, league.points_per_win),
    });
  });

  routes.get('/api/public/results', async (c) => {
    const requested = Number(c.req.query('limit') ?? 50);
    const limit = Number.isFinite(requested) ? requested : 50;
    publicCache(c);
    return c.json({ results: await listConfirmedMatches(c.env.DB, 'misfits-501', limit) });
  });

  routes.get('/api/public/players', async (c) => {
    publicCache(c);
    return c.json({ players: await listPublicPlayers(c.env.DB) });
  });

  return routes;
}
