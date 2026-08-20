import { Hono, type Context } from 'hono';
import { requireSameOrigin, requireUser, type AuthAppEnv } from '../auth/guards';
import { resolveRequestSession, type AuthUser } from '../auth/session';
import { AppError, jsonError } from '../errors';
import { canViewLeague, getLeagueByIdOrSlug, listLeagueMembers, listPublicLeagues, listUserLeagues, type LeagueRecord } from '../db/leagues';
import { joinLeagueByInvite } from '../db/invites';

interface LeagueRouteDependencies {
  now?: () => Date;
}

function publicLeague(league: Awaited<ReturnType<typeof getLeagueByIdOrSlug>>) {
  if (!league) return null;
  return {
    id: league.id,
    name: league.name,
    slug: league.slug,
    seasonName: league.season_name,
    status: league.status,
    pointsPerWin: league.points_per_win,
    targetLegs: league.target_legs,
    maxPlayers: league.max_players,
    matchesPerPair: league.matches_per_pair,
    visibility: league.visibility,
  };
}

async function findViewableLeague(c: Context<AuthAppEnv>, key: string): Promise<LeagueRecord | null> {
  const league = await getLeagueByIdOrSlug(c.env.DB, key);
  if (!league) return null;
  const user = await resolveRequestSession(c.env.DB, c.req.raw);
  return await canViewLeague(c.env.DB, league, user ?? undefined) ? league : null;
}

function publicPlayers(members: Awaited<ReturnType<typeof listLeagueMembers>>) {
  return members
    .filter((member) => member.active === 1)
    .map((member) => ({ id: member.user_id, username: member.username, profileImageUrl: member.profile_image_url }));
}

export function createLeagueRoutes(dependencies: LeagueRouteDependencies = {}) {
  const routes = new Hono<AuthAppEnv>();
  const now = dependencies.now ?? (() => new Date());

  routes.get('/api/public/leagues', async (c) => {
    const leagues = await listPublicLeagues(c.env.DB);
    return c.json({ leagues: leagues.map((league) => publicLeague(league)) }, 200, { 'Cache-Control': 'public, max-age=30' });
  });

  routes.get('/api/public/leagues/:key', async (c) => {
    const league = await findViewableLeague(c, c.req.param('key'));
    if (!league) return jsonError(c, new AppError('LEAGUE_NOT_FOUND', 'League was not found', 404));
    const members = await listLeagueMembers(c.env.DB, league.id);
    return c.json({ league: publicLeague(league), players: publicPlayers(members) }, 200, { 'Cache-Control': league.visibility === 'PUBLIC' ? 'public, max-age=30' : 'private, no-store' });
  });

  routes.get('/api/public/leagues/:key/players', async (c) => {
    const league = await findViewableLeague(c, c.req.param('key'));
    if (!league) return jsonError(c, new AppError('LEAGUE_NOT_FOUND', 'League was not found', 404));
    const members = await listLeagueMembers(c.env.DB, league.id);
    return c.json({ players: publicPlayers(members) }, 200, { 'Cache-Control': league.visibility === 'PUBLIC' ? 'public, max-age=30' : 'private, no-store' });
  });

  routes.get('/api/me/leagues', requireUser, async (c) => {
    const leagues = await listUserLeagues(c.env.DB, c.get('user').id);
    return c.json({ leagues: leagues.map((league) => publicLeague(league)) }, 200, { 'Cache-Control': 'private, no-store' });
  });

  routes.post('/api/invites/:token/join', requireSameOrigin, requireUser, async (c) => {
    try {
      const member = await joinLeagueByInvite(c.env.DB, c.get('user').id, c.req.param('token'), now());
      return c.json({ membership: { leagueId: member.league_id, userId: member.user_id, active: member.active === 1 } }, 200, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      if (error instanceof AppError) return jsonError(c, error);
      return jsonError(c, new AppError('INVITE_INVALID', 'That invite link could not be used', 400));
    }
  });

  return routes;
}
