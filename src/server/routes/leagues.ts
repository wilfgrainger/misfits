import { Hono } from 'hono';
import { requireClubMember, requireUser, type AuthAppEnv } from '../auth/guards';
import { AppError, jsonError } from '../errors';
import { getLeagueByIdOrSlug, listClubLeagues, listLeagueMembers, listUserLeagues } from '../db/leagues';
import { getCompetitionLeague, getSeason, listFixtures, listUserSeasonHistory } from '../db/competition';
import { getPromotionPreview, listUserSeasonMovements, type SeasonMovementRecord } from '../db/promotion';

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
    maxLegs: league.max_legs ?? ((league.target_legs * 2) - 1),
    pointsPerWin: league.points_per_win,
    pointsPerDraw: league.points_per_draw ?? 0,
    pointsPerLoss: league.points_per_loss ?? 0,
    targetLegs: league.target_legs,
    maxPlayers: league.max_players,
    matchesPerPair: league.matches_per_pair,
    visibility: league.visibility,
    seasonId: league.season_id,
    hierarchyPosition: league.hierarchy_position,
    promotionPlaces: league.promotion_places,
    relegationPlaces: league.relegation_places,
  };
}

function publicPlayers(members: Awaited<ReturnType<typeof listLeagueMembers>>) {
  return members
    .filter((member) =>
      member.active === 1
      && (member.role === undefined || member.role === 'PLAYER')
      && (member.status === undefined || member.status === 'ACTIVE')
      && (member.club_status === undefined || member.club_status === 'APPROVED'),
    )
    .map((member) => ({ id: member.user_id, username: member.username, profileImageUrl: member.profile_image_url }));
}

function memberFixture(fixture: Awaited<ReturnType<typeof listFixtures>>[number]) {
  return {
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
    resultStatus: fixture.result_status ?? null,
    playerALegs: fixture.player_a_legs ?? null,
    playerBLegs: fixture.player_b_legs ?? null,
    playerAAverage: fixture.player_a_average ?? null,
    playerBAverage: fixture.player_b_average ?? null,
    submittedBy: fixture.submitted_by ?? null,
    disputeNote: fixture.dispute_note ?? null,
    confirmedAt: fixture.confirmed_at ?? null,
  };
}

function publicFixture(fixture: Awaited<ReturnType<typeof listFixtures>>[number]) {
  return {
    round: fixture.round,
    meetingNumber: fixture.meeting_number,
    status: fixture.status,
    playerAUsername: fixture.player_a_username ?? null,
    playerBUsername: fixture.player_b_username ?? null,
    result: fixture.status === 'CONFIRMED' && fixture.result_status === 'CONFIRMED'
      ? {
          playerALegs: fixture.player_a_legs ?? null,
          playerBLegs: fixture.player_b_legs ?? null,
          playerAAverage: fixture.player_a_average ?? null,
          playerBAverage: fixture.player_b_average ?? null,
          confirmedAt: fixture.confirmed_at ?? null,
        }
      : null,
  };
}

function movementSummary(movement: Partial<SeasonMovementRecord> & { userId?: string; fromSeasonId?: string; toSeasonId?: string | null; fromLeagueId?: string; toLeagueId?: string | null; fromPosition?: number; kind?: string; decidedBy?: string | null; createdAt?: string; updatedAt?: string }) {
  return {
    id: movement.id,
    fromSeasonId: movement.from_season_id ?? movement.fromSeasonId,
    toSeasonId: movement.to_season_id ?? movement.toSeasonId ?? null,
    userId: movement.user_id ?? movement.userId ?? '',
    fromLeagueId: movement.from_league_id ?? movement.fromLeagueId ?? '',
    toLeagueId: movement.to_league_id ?? movement.toLeagueId ?? null,
    fromPosition: movement.from_position ?? movement.fromPosition ?? 0,
    kind: movement.kind ?? 'MANUAL',
    status: movement.status,
    reason: movement.reason ?? null,
    decidedBy: movement.decided_by ?? movement.decidedBy ?? null,
    createdAt: movement.created_at ?? movement.createdAt,
    updatedAt: movement.updated_at ?? movement.updatedAt,
  };
}

async function movementNames(db: D1Database, movement: ReturnType<typeof movementSummary>) {
  const fromLeague = movement.fromLeagueId ? await getCompetitionLeague(db, movement.fromLeagueId) : null;
  const toLeague = movement.toLeagueId ? await getCompetitionLeague(db, movement.toLeagueId) : null;
  const toSeason = movement.toSeasonId ? await getSeason(db, movement.toSeasonId) : null;
  return { ...movement, fromLeagueName: fromLeague?.name ?? null, toLeagueName: toLeague?.name ?? null, toSeasonName: toSeason?.name ?? null };
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

  routes.get('/api/leagues/:leagueId/fixtures', requireUser, requireClubMember, async (c) => {
    const league = await getLeagueByIdOrSlug(c.env.DB, c.req.param('leagueId'));
    if (!league) return jsonError(c, new AppError('LEAGUE_NOT_FOUND', 'League was not found', 404));
    return c.json({ fixtures: (await listFixtures(c.env.DB, league.id)).map(memberFixture) }, 200, { 'Cache-Control': 'private, no-store' });
  });

  routes.get('/api/me/leagues/:leagueId/fixtures', requireUser, requireClubMember, async (c) => {
    const league = await getLeagueByIdOrSlug(c.env.DB, c.req.param('leagueId'));
    if (!league) return jsonError(c, new AppError('LEAGUE_NOT_FOUND', 'League was not found', 404));
    return c.json({ fixtures: (await listFixtures(c.env.DB, league.id, undefined, c.get('user').id)).map(memberFixture) }, 200, { 'Cache-Control': 'private, no-store' });
  });

  routes.get('/api/public/leagues/:key/fixtures', async (c) => {
    const league = await getLeagueByIdOrSlug(c.env.DB, c.req.param('key'));
    if (!league || league.visibility !== 'PUBLIC') return jsonError(c, new AppError('LEAGUE_NOT_FOUND', 'Public league was not found', 404));
    return c.json({ fixtures: (await listFixtures(c.env.DB, league.id)).map(publicFixture) }, 200, { 'Cache-Control': 'public, max-age=30' });
  });

  routes.get('/api/public/open-leagues/:key', async (c) => {
    const league = await getLeagueByIdOrSlug(c.env.DB, c.req.param('key'));
    if (!league || league.visibility !== 'PUBLIC') return jsonError(c, new AppError('LEAGUE_NOT_FOUND', 'Public league was not found', 404));
    return c.json({ league: publicLeague(league), players: [] }, 200, { 'Cache-Control': 'public, max-age=30' });
  });

  routes.get('/api/me/leagues', requireUser, requireClubMember, async (c) => {
    const leagues = await listUserLeagues(c.env.DB, c.get('user').id);
    return c.json({ leagues: leagues.map((league) => publicLeague(league)) }, 200, { 'Cache-Control': 'private, no-store' });
  });

  routes.get('/api/me/seasons', requireUser, requireClubMember, async (c) => {
    const [history, movements] = await Promise.all([
      listUserSeasonHistory(c.env.DB, c.get('user').id),
      listUserSeasonMovements(c.env.DB, c.get('user').id),
    ]);
    const movementPayloads = await Promise.all(movements.map(async (movement) => movementNames(c.env.DB, movementSummary(movement))));
    return c.json({
      seasons: history.map(({ season, leagues }) => ({
        season: {
          id: season.id,
          name: season.name,
          status: season.status,
          isCurrent: season.is_current === 1,
          createdAt: season.created_at,
          updatedAt: season.updated_at,
          closedAt: season.closed_at,
        },
        leagues: leagues.map((league) => publicLeague(league)),
        placedLeagueIds: leagues.filter((league) => league.membership_active === 1).map((league) => league.id),
      })),
      movements: movementPayloads,
    }, 200, { 'Cache-Control': 'private, no-store' });
  });

  routes.get('/api/me/seasons/:seasonId/movement', requireUser, requireClubMember, async (c) => {
    const seasonId = c.req.param('seasonId');
    const season = await getSeason(c.env.DB, seasonId);
    if (!season) return jsonError(c, new AppError('LEAGUE_NOT_FOUND', 'Season was not found', 404));

    const saved = (await listUserSeasonMovements(c.env.DB, c.get('user').id)).find((movement) => movement.from_season_id === seasonId) ?? null;
    let preview: Awaited<ReturnType<typeof getPromotionPreview>> | null = null;
    try { preview = await getPromotionPreview(c.env.DB, seasonId); } catch { preview = null; }
    const projected = preview?.movements.find((movement) => movement.userId === c.get('user').id) ?? null;
    const rawMovement = saved ? movementSummary(saved) : projected ? movementSummary({ ...projected, fromSeasonId: seasonId }) : null;
    const movement = rawMovement ? await movementNames(c.env.DB, rawMovement) : null;
    const assigned = await c.env.DB.prepare(
      `SELECT league_id FROM league_players WHERE user_id = ? AND season_id = ? AND active = 1`,
    ).bind(c.get('user').id, seasonId).all<{ league_id: string }>();
    const assignedLeagueIds = new Set(assigned.results.map((row) => row.league_id));
    const ambiguity = preview?.ambiguities.find((item) =>
      item.tiedUserIds.includes(c.get('user').id) || assignedLeagueIds.has(item.leagueId),
    );
    const state = saved?.status === 'APPLIED'
      ? 'CONFIRMED'
      : saved?.status === 'APPROVED'
        ? 'APPROVED'
        : saved
          ? 'PROPOSED'
          : projected
            ? 'PROVISIONAL'
            : 'NONE';
    return c.json({
      seasonId,
      state,
      provisional: state === 'PROVISIONAL',
      unresolvedCount: preview?.unresolvedCount ?? 0,
      movement,
      ambiguity: ambiguity ? { boundary: ambiguity.boundary, position: ambiguity.position } : null,
    }, 200, { 'Cache-Control': 'private, no-store' });
  });

  return routes;
}
