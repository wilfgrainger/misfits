import {
  calculatePromotionProjection,
  type LeagueMovementConfig,
  type PromotionAmbiguity,
  type PromotionMovement,
  type StandingPosition,
} from '../domain/competition';
import { AppError } from '../errors';
import {
  getCompetitionLeague,
  getSeason,
  listSeasonLeagues,
  type CompetitionLeagueRecord,
} from './competition';
import { getLeagueStandings } from './results';

export interface SeasonMovementRecord {
  id: string;
  from_season_id: string;
  to_season_id: string | null;
  user_id: string;
  from_league_id: string;
  to_league_id: string | null;
  from_position: number;
  kind: 'PROMOTED' | 'RELEGATED' | 'MANUAL';
  status: 'PROPOSED' | 'APPROVED' | 'APPLIED';
  reason: string | null;
  decided_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PromotionPreview {
  seasonId: string;
  provisional: boolean;
  unresolvedCount: number;
  movements: PromotionMovement[];
  ambiguities: PromotionAmbiguity[];
}

export interface NextSeasonPlacement {
  userId: string;
  leagueId: string;
}

interface SeasonMembershipPlacement {
  league_id: string;
  season_id: string;
  user_id: string;
  active: number;
  joined_at: string;
  hierarchy_position: number;
}

interface TargetMembership {
  league_id: string;
  season_id: string;
  user_id: string;
  active: number;
  joined_at: string;
}

function at(now: Date): string {
  return now.toISOString();
}

function movementConfig(league: CompetitionLeagueRecord): LeagueMovementConfig {
  return {
    leagueId: league.id,
    hierarchyPosition: league.hierarchy_position,
    promotionPlaces: league.promotion_places,
    relegationPlaces: league.relegation_places,
  };
}

async function standingsForSeason(db: D1Database, leagues: CompetitionLeagueRecord[]): Promise<Map<string, StandingPosition[]>> {
  const standings = new Map<string, StandingPosition[]>();
  for (const league of leagues) {
    const rows = await getLeagueStandings(db, league.id);
    standings.set(league.id, rows.map((row) => ({
      userId: row.playerId,
      position: row.rank,
      points: row.points,
      legDifference: row.legDifference,
      legsFor: row.legsFor,
      average: row.average,
      username: row.username,
    })));
  }
  return standings;
}

async function unresolvedCompetitionCount(db: D1Database, seasonId: string): Promise<number> {
  const fixtures = await db.prepare(
    `SELECT COUNT(*) AS count
       FROM fixtures
      WHERE season_id = ?
        AND status IN ('OUTSTANDING', 'PENDING_CONFIRMATION', 'DISPUTED')`,
  ).bind(seasonId).first<{ count: number }>();

  const results = await db.prepare(
    `SELECT COUNT(*) AS count
       FROM matches
       JOIN leagues ON leagues.id = matches.league_id
      WHERE leagues.season_id = ?
        AND matches.deleted_at IS NULL
        AND matches.status <> 'CONFIRMED'`,
  ).bind(seasonId).first<{ count: number }>();

  return Number(fixtures?.count ?? 0) + Number(results?.count ?? 0);
}

export async function getPromotionPreview(db: D1Database, seasonId: string): Promise<PromotionPreview> {
  const season = await getSeason(db, seasonId);
  if (!season) throw new AppError('LEAGUE_NOT_FOUND', 'Season was not found', 404);
  const leagues = await listSeasonLeagues(db, seasonId);
  if (leagues.length === 0) throw new AppError('VALIDATION_ERROR', 'Season has no leagues to project', 409);

  const standings = await standingsForSeason(db, leagues);
  let projection;
  try {
    projection = calculatePromotionProjection(standings, leagues.map(movementConfig));
  } catch (error) {
    if (error instanceof Error && /overlap/i.test(error.message)) {
      throw new AppError('VALIDATION_ERROR', 'Promotion and relegation places exceed the active league roster', 409);
    }
    throw error;
  }
  const unresolvedCount = await unresolvedCompetitionCount(db, seasonId);

  return {
    seasonId,
    provisional: season.status !== 'CLOSED' || unresolvedCount > 0 || projection.ambiguities.length > 0,
    unresolvedCount,
    movements: projection.movements,
    ambiguities: projection.ambiguities,
  };
}

async function requireClosedFinalSeason(db: D1Database, seasonId: string): Promise<PromotionPreview> {
  const season = await getSeason(db, seasonId);
  if (!season) throw new AppError('LEAGUE_NOT_FOUND', 'Season was not found', 404);
  if (season.status !== 'CLOSED') throw new AppError('VALIDATION_ERROR', 'Season must be closed before promotion can be finalised', 409);

  const preview = await getPromotionPreview(db, seasonId);
  if (preview.unresolvedCount > 0) {
    throw new AppError('VALIDATION_ERROR', 'Promotion cannot be finalised while unresolved fixtures or results remain', 409);
  }
  if (preview.ambiguities.length > 0) {
    throw new AppError('VALIDATION_ERROR', 'Promotion cannot be finalised while a movement-boundary tie is unresolved', 409);
  }
  return preview;
}

async function requireDraftTargetSeason(db: D1Database, fromSeasonId: string, toSeasonId: string) {
  if (fromSeasonId === toSeasonId) throw new AppError('VALIDATION_ERROR', 'Next season must be different from the completed season', 409);
  const target = await getSeason(db, toSeasonId);
  if (!target) throw new AppError('LEAGUE_NOT_FOUND', 'Target season was not found', 404);
  if (target.status !== 'DRAFT') throw new AppError('VALIDATION_ERROR', 'Next-season placement can only be prepared in a draft season', 409);
  return target;
}

function leaguesByHierarchy(leagues: CompetitionLeagueRecord[]): Map<number, CompetitionLeagueRecord> {
  return new Map(leagues.map((league) => [league.hierarchy_position, league]));
}

function requireMatchingTargetStructure(source: CompetitionLeagueRecord[], target: CompetitionLeagueRecord[]): Map<number, CompetitionLeagueRecord> {
  const targetByHierarchy = leaguesByHierarchy(target);
  for (const sourceLeague of source) {
    if (!targetByHierarchy.has(sourceLeague.hierarchy_position)) {
      throw new AppError('VALIDATION_ERROR', `Target season is missing hierarchy position ${sourceLeague.hierarchy_position}`, 409);
    }
  }
  return targetByHierarchy;
}

export async function listSeasonMovements(db: D1Database, fromSeasonId: string, toSeasonId?: string): Promise<SeasonMovementRecord[]> {
  const targetClause = toSeasonId ? ' AND to_season_id = ?' : '';
  const values = toSeasonId ? [fromSeasonId, toSeasonId] : [fromSeasonId];
  const result = await db.prepare(
    `SELECT id, from_season_id, to_season_id, user_id, from_league_id, to_league_id,
            from_position, kind, status, reason, decided_by, created_at, updated_at
       FROM season_movements
      WHERE from_season_id = ?${targetClause}
      ORDER BY from_league_id, from_position, user_id`,
  ).bind(...values).all<SeasonMovementRecord>();
  return result.results;
}

async function getSeasonMovement(db: D1Database, fromSeasonId: string, userId: string): Promise<SeasonMovementRecord | null> {
  return (await db.prepare(
    `SELECT id, from_season_id, to_season_id, user_id, from_league_id, to_league_id,
            from_position, kind, status, reason, decided_by, created_at, updated_at
       FROM season_movements
      WHERE from_season_id = ? AND user_id = ?`,
  ).bind(fromSeasonId, userId).first<SeasonMovementRecord>()) ?? null;
}

export async function createPromotionProposal(
  db: D1Database,
  actorUserId: string,
  fromSeasonId: string,
  toSeasonId: string,
  now = new Date(),
): Promise<SeasonMovementRecord[]> {
  const preview = await requireClosedFinalSeason(db, fromSeasonId);
  await requireDraftTargetSeason(db, fromSeasonId, toSeasonId);

  const existing = await listSeasonMovements(db, fromSeasonId);
  if (existing.some((row) => row.status === 'APPLIED')) {
    throw new AppError('VALIDATION_ERROR', 'Promotion plan has already been applied for this season', 409);
  }

  const sourceLeagues = await listSeasonLeagues(db, fromSeasonId);
  const targetLeagues = await listSeasonLeagues(db, toSeasonId);
  const targetByHierarchy = requireMatchingTargetStructure(sourceLeagues, targetLeagues);
  const sourceById = new Map(sourceLeagues.map((league) => [league.id, league]));
  const timestamp = at(now);
  const statements: D1PreparedStatement[] = [];

  for (const movement of preview.movements) {
    const sourceDestination = sourceById.get(movement.toLeagueId);
    if (!sourceDestination) throw new AppError('VALIDATION_ERROR', 'Promotion destination is no longer part of the source hierarchy', 409);
    const targetLeague = targetByHierarchy.get(sourceDestination.hierarchy_position);
    if (!targetLeague) throw new AppError('VALIDATION_ERROR', 'Target season does not contain the required destination league', 409);

    statements.push(db.prepare(
      `INSERT INTO season_movements (
         id, from_season_id, to_season_id, user_id, from_league_id, to_league_id,
         from_position, kind, status, reason, decided_by, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PROPOSED', NULL, NULL, ?, ?)
       ON CONFLICT(from_season_id, user_id) DO UPDATE SET
         to_season_id = excluded.to_season_id,
         from_league_id = excluded.from_league_id,
         to_league_id = excluded.to_league_id,
         from_position = excluded.from_position,
         kind = excluded.kind,
         status = 'PROPOSED',
         reason = NULL,
         decided_by = NULL,
         updated_at = excluded.updated_at
       WHERE season_movements.status <> 'APPLIED'`,
    ).bind(
      crypto.randomUUID(),
      fromSeasonId,
      toSeasonId,
      movement.userId,
      movement.fromLeagueId,
      targetLeague.id,
      movement.fromPosition,
      movement.kind,
      timestamp,
      timestamp,
    ));
  }

  statements.push(db.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
     VALUES (?, 'PROMOTION_PROPOSED', 'SEASON', ?, NULL, ?, ?)`,
  ).bind(actorUserId, fromSeasonId, JSON.stringify({ toSeasonId, movements: preview.movements }), timestamp));

  await db.batch(statements);
  return listSeasonMovements(db, fromSeasonId, toSeasonId);
}

export async function overridePromotionMovement(
  db: D1Database,
  actorUserId: string,
  fromSeasonId: string,
  userId: string,
  toLeagueId: string,
  reason: string,
  now = new Date(),
): Promise<SeasonMovementRecord> {
  const movement = await getSeasonMovement(db, fromSeasonId, userId);
  if (!movement || !movement.to_season_id) throw new AppError('VALIDATION_ERROR', 'Proposed movement was not found', 404);
  if (movement.status === 'APPLIED') throw new AppError('VALIDATION_ERROR', 'Applied movement history cannot be rewritten', 409);

  const target = await getCompetitionLeague(db, toLeagueId);
  if (!target || target.season_id !== movement.to_season_id) {
    throw new AppError('VALIDATION_ERROR', 'Override target must be a league in the proposed next season', 409);
  }
  const trimmed = reason.trim();
  if (!trimmed || trimmed.length > 240) throw new AppError('VALIDATION_ERROR', 'A short override reason is required', 400);

  const timestamp = at(now);
  const updated = await db.prepare(
    `UPDATE season_movements
        SET to_league_id = ?, kind = 'MANUAL', reason = ?, decided_by = ?, updated_at = ?
      WHERE from_season_id = ? AND user_id = ? AND status <> 'APPLIED'`,
  ).bind(toLeagueId, trimmed, actorUserId, timestamp, fromSeasonId, userId).run();
  if (updated.meta.changes !== 1) throw new AppError('VALIDATION_ERROR', 'Proposed movement could not be overridden', 409);

  await db.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
     VALUES (?, 'PROMOTION_OVERRIDE', 'SEASON_MOVEMENT', ?, ?, ?, ?)`,
  ).bind(actorUserId, movement.id, JSON.stringify(movement), JSON.stringify({ toLeagueId, reason: trimmed }), timestamp).run();

  const saved = await getSeasonMovement(db, fromSeasonId, userId);
  if (!saved) throw new Error('Promotion movement could not be loaded after override');
  return saved;
}

async function listSourceMemberships(db: D1Database, seasonId: string): Promise<SeasonMembershipPlacement[]> {
  const result = await db.prepare(
    `SELECT lp.league_id, lp.season_id, lp.user_id, lp.active, lp.joined_at, l.hierarchy_position
       FROM league_players lp
       JOIN leagues l ON l.id = lp.league_id
      WHERE lp.season_id = ? AND lp.active = 1
      ORDER BY l.hierarchy_position, lp.user_id`,
  ).bind(seasonId).all<SeasonMembershipPlacement>();
  return result.results;
}

async function listTargetMemberships(db: D1Database, seasonId: string): Promise<TargetMembership[]> {
  const result = await db.prepare(
    `SELECT league_id, season_id, user_id, active, joined_at
       FROM league_players
      WHERE season_id = ? AND active = 1
      ORDER BY league_id, user_id`,
  ).bind(seasonId).all<TargetMembership>();
  return result.results;
}

function validatePlacementCapacity(
  placements: NextSeasonPlacement[],
  targetLeagues: CompetitionLeagueRecord[],
  existing: TargetMembership[],
  sourceUserIds: Set<string>,
): void {
  const targetById = new Map(targetLeagues.map((league) => [league.id, league]));
  const occupancy = new Map<string, number>();
  for (const placement of placements) occupancy.set(placement.leagueId, (occupancy.get(placement.leagueId) ?? 0) + 1);
  for (const membership of existing) {
    if (sourceUserIds.has(membership.user_id)) continue;
    occupancy.set(membership.league_id, (occupancy.get(membership.league_id) ?? 0) + 1);
  }
  for (const [leagueId, count] of occupancy) {
    const league = targetById.get(leagueId);
    if (!league) throw new AppError('VALIDATION_ERROR', 'A proposed placement references a league outside the target season', 409);
    if (count > league.max_players) throw new AppError('LEAGUE_FULL', `Target league capacity would be exceeded for ${league.name}`, 409);
  }
}

export async function applyPromotionProposal(
  db: D1Database,
  actorUserId: string,
  fromSeasonId: string,
  toSeasonId: string,
  now = new Date(),
): Promise<{ placements: NextSeasonPlacement[]; movements: SeasonMovementRecord[] }> {
  await requireClosedFinalSeason(db, fromSeasonId);
  await requireDraftTargetSeason(db, fromSeasonId, toSeasonId);

  const sourceLeagues = await listSeasonLeagues(db, fromSeasonId);
  const targetLeagues = await listSeasonLeagues(db, toSeasonId);
  const targetByHierarchy = requireMatchingTargetStructure(sourceLeagues, targetLeagues);
  const sourceMembers = await listSourceMemberships(db, fromSeasonId);
  const movements = await listSeasonMovements(db, fromSeasonId, toSeasonId);
  const movementByUser = new Map(movements.map((movement) => [movement.user_id, movement]));
  const targetById = new Map(targetLeagues.map((league) => [league.id, league]));

  const placements: NextSeasonPlacement[] = sourceMembers.map((member) => {
    const movement = movementByUser.get(member.user_id);
    const defaultLeague = targetByHierarchy.get(member.hierarchy_position);
    const leagueId = movement?.to_league_id ?? defaultLeague?.id;
    if (!leagueId || !targetById.has(leagueId)) {
      throw new AppError('VALIDATION_ERROR', 'Every source competitor must resolve to one valid next-season league', 409);
    }
    return { userId: member.user_id, leagueId };
  }).sort((left, right) => left.userId.localeCompare(right.userId));

  if (new Set(placements.map((row) => row.userId)).size !== sourceMembers.length) {
    throw new AppError('VALIDATION_ERROR', 'Each source competitor must have exactly one next-season placement', 409);
  }

  const existingTarget = await listTargetMemberships(db, toSeasonId);
  const desiredByUser = new Map(placements.map((placement) => [placement.userId, placement.leagueId]));
  for (const existing of existingTarget) {
    const desired = desiredByUser.get(existing.user_id);
    if (desired && desired !== existing.league_id) {
      throw new AppError('VALIDATION_ERROR', 'A player already has a different active placement in the target season', 409);
    }
  }

  const sourceUserIds = new Set(sourceMembers.map((member) => member.user_id));
  validatePlacementCapacity(placements, targetLeagues, existingTarget, sourceUserIds);

  const timestamp = at(now);
  const statements: D1PreparedStatement[] = placements.map((placement) => db.prepare(
    `INSERT INTO league_players (league_id, user_id, active, joined_at, season_id)
     VALUES (?, ?, 1, ?, ?)
     ON CONFLICT(league_id, user_id) DO UPDATE SET active = 1, season_id = excluded.season_id`,
  ).bind(placement.leagueId, placement.userId, timestamp, toSeasonId));

  statements.push(db.prepare(
    `UPDATE season_movements
        SET status = 'APPLIED', decided_by = ?, updated_at = ?
      WHERE from_season_id = ? AND to_season_id = ? AND status <> 'APPLIED'`,
  ).bind(actorUserId, timestamp, fromSeasonId, toSeasonId));
  statements.push(db.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
     VALUES (?, 'PROMOTION_APPLIED', 'SEASON', ?, NULL, ?, ?)`,
  ).bind(actorUserId, fromSeasonId, JSON.stringify({ toSeasonId, placements }), timestamp));

  await db.batch(statements);
  return { placements, movements: await listSeasonMovements(db, fromSeasonId, toSeasonId) };
}
