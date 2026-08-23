import { Hono } from 'hono';
import { requireClubMember, requireUser, type AuthAppEnv } from '../auth/guards';
import { AppError, jsonError } from '../errors';
import { getLeagueByIdOrSlug, listClubLeagues, listLeagueMembers, listUserLeagues } from '../db/leagues';
import { listFixtures } from '../db/competition';
import { getMemberPromotionPreview, listMemberMovementHistory } from '../db/promotion';

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
    seasonId: league.season_id ?? null,
    maxLegs: league.max_legs ?? ((league.target_legs * 2) - 1),
    pointsPerWin: league.points_per_win,
    pointsPerDraw: league.points_per_draw ?? 0,
    pointsPerLoss: league.points_per_loss ?? 0,
    targetLegs: league.target_legs,
    maxPlayers: league.max_players,
    matchesPerPair: league.matches_per_pair,
    visibility: league.visibility,
    hierarchyPosition: league.hierarchy_position ?? 0,
    promotionPlaces: league.promotion_places ?? 0,
    relegationPlaces: league.relegation_places ?? 0,
  };
}

function publicPlayers(members: Awaited<ReturnType<typeof listLeagueMembers>>) {
  return members
    .filter((member) => member.active === 1)
    .map((member) => ({ id: member.user_id, username: member.username, profileImageUrl: member.profile_image_url }));
}

function memberMovement(movement: Awaited<ReturnType<typeof listMemberMovementHistory>>[number]) {
  return {
    id: movement.id,
    fromSeasonId: movement.from_season_id,
    toSeasonId: movement.to_season_id,
    userId: movement.user_id,
    fromLeagueId: movement.from_league_id,
    toLeagueId: movement.to_league_id,
    fromPosition: movement.from_position,
    kind: movement.kind,
    status: movement.status,
    reason: movement.reason,
    decidedBy: movement.decided_by,
    createdAt: movement.created_at,
    updatedAt: movement.updated_at,
    fromSeasonName: movement.from_season_name,
    toSeasonName: movement.to_season_name,
    fromLeagueName: movement.from_league_name,
    toLeagueName: movement.to_league_name,
  };
}

export function createLeagueRoutes(_dependencies: LeagueRouteDependencies = {}) {
  const routes = new Hono<AuthAppEnv>();

  routes.get('/api/public/leagues', requireUser, requireClubMember, async (c) => {
    const leagues = await listClubLeagues(c.env.DB);
    return c.json({ leagues: leagues.map((league) => publicLeague(league)) }, 200, { 'Cache-Control': 'private, no-store' });
  });

  routes.get('/api/public/leagues/:key', requireUser, requireClubMember, async (c) => {
    const league = await getLeagueByIdOrSlug(c.env.DB, c.req.param('key'));
    if (!league) return jsonError(c, new AppError('LEAGUE_NOT_FOUND', 'League was not found', 404));
    const members = await listLeagueMembers(c.env.DB, league.id);
    return c.json({ league: publicLeague(league), players: publicPlayers(members) }, 200, { 'Cache-Control': 'private, no-store' });
  });

  routes.get('/api/public/leagues/:key/players', requireUser, requireClubMember, async (c) => {
    const league = await getLeagueByIdOrSlug(c.env.DB, c.req.param('key'));
    if (!league) return jsonError(c, new AppError('LEAGUE_NOT_FOUND', 'League was not found', 404));
    const members = await listLeagueMembers(c.env.DB, league.id);
    return c.json({ players: publicPlayers(members) }, 200, { 'Cache-Control': 'private, no-store' });
  });

  routes.get('/api/public/leagues/:key/fixtures', requireUser, requireClubMember, async (c) => {
    const league = await getLeagueByIdOrSlug(c.env.DB, c.req.param('key'));
    if (!league) return jsonError(c, new AppError('LEAGUE_NOT_FOUND', 'League was not found', 404));
    try {
      const fixtures = await listFixtures(c.env.DB, league.id);
      return c.json({
        fixtures: fixtures.map((fixture) => ({
          id: fixture.id,
          seasonId: fixture.season_id,
          leagueId: fixture.league_id,
          playerAId: fixture.player_a_id,
          playerBId: fixture.player_b_id,
          pairKey: fixture.pair_key,
          round: fixture.round,
          meetingNumber: fixture.meeting_number,
          status: fixture.status,
          createdAt: fixture.created_at,
          updatedAt: fixture.updated_at,
          voidedAt: fixture.voided_at,
          playerAUsername: fixture.player_a_username ?? null,
          playerBUsername: fixture.player_b_username ?? null,
          resultId: fixture.result_id ?? null,
          result: fixture.result_id ? {
            id: fixture.result_id,
            playerALegs: Number(fixture.result_player_a_legs ?? 0),
            playerBLegs: Number(fixture.result_player_b_legs ?? 0),
            playerAAverage: Number(fixture.result_player_a_average ?? 0),
            playerBAverage: Number(fixture.result_player_b_average ?? 0),
            submittedBy: fixture.result_submitted_by ?? null,
            status: fixture.result_status ?? null,
            disputeNote: fixture.result_dispute_note ?? null,
            createdAt: fixture.result_created_at ?? null,
            confirmedAt: fixture.result_confirmed_at ?? null,
          } : null,
        })),
      }, 200, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      if (error instanceof AppError) return jsonError(c, error);
      return jsonError(c, new AppError('VALIDATION_ERROR', 'Fixtures could not be loaded', 400));
    }
  });

  routes.get('/api/public/seasons/:seasonId/promotion', requireUser, requireClubMember, async (c) => {
    try {
      return c.json({ preview: await getMemberPromotionPreview(c.env.DB, c.req.param('seasonId')) }, 200, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      if (error instanceof AppError) return jsonError(c, error);
      return jsonError(c, new AppError('VALIDATION_ERROR', 'Movement projection could not be loaded', 400));
    }
  });

  routes.get('/api/me/movements', requireUser, requireClubMember, async (c) => {
    const movements = await listMemberMovementHistory(c.env.DB, c.get('user').id);
    return c.json({ movements: movements.map(memberMovement) }, 200, { 'Cache-Control': 'private, no-store' });
  });

  routes.get('/api/me/leagues', requireUser, requireClubMember, async (c) => {
    const leagues = await listUserLeagues(c.env.DB, c.get('user').id);
    return c.json({ leagues: leagues.map((league) => publicLeague(league)) }, 200, { 'Cache-Control': 'private, no-store' });
  });

  return routes;
}
