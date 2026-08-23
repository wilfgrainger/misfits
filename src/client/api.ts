export type ClubStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface UserSummary {
  id: string;
  username: string | null;
  role: 'PLAYER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  clubStatus: ClubStatus;
  profileImageUrl: string | null;
  dartsCounterUrl: string | null;
  isMasterAdmin: boolean;
}

export interface AuthPayload {
  user: UserSummary;
  requiresOnboarding: boolean;
}

export interface AdminPlayer extends UserSummary {
  email: string;
  leagueActive: boolean;
  createdAt: string;
}

export interface AdminPlayerChanges {
  role?: UserSummary['role'];
  status?: UserSummary['status'];
  clubStatus?: ClubStatus;
}

export type SeasonStatus = 'DRAFT' | 'OPEN' | 'CLOSED';

export interface SeasonSummary {
  id: string;
  name: string;
  status: SeasonStatus;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface SeasonInput {
  name: string;
  status: SeasonStatus;
  isCurrent: boolean;
}

export interface LeagueSummary {
  id: string;
  name: string;
  slug: string;
  seasonName: string;
  status: 'OPEN' | 'CLOSED';
  maxLegs: number;
  pointsPerWin: number;
  pointsPerDraw: number;
  pointsPerLoss: number;
  /** Derived compatibility mirror. New admin writes use maxLegs only. */
  targetLegs: number;
  maxPlayers: number;
  matchesPerPair: number;
  createdBy?: string | null;
  visibility: 'PUBLIC' | 'PRIVATE';
  seasonId?: string | null;
  hierarchyPosition?: number;
  promotionPlaces?: number;
  relegationPlaces?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaguePlayer {
  id: string;
  username: string | null;
  profileImageUrl: string | null;
}

export interface LeagueDetail extends LeagueSummary {
  players: LeaguePlayer[];
}

export interface StandingRow {
  rank: number;
  playerId: string;
  username: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  legsFor: number;
  legsAgainst: number;
  legDifference: number;
  points: number;
  average: number;
}

export type FixtureStatus = 'OUTSTANDING' | 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'DISPUTED' | 'VOID';

export interface FixtureSummary {
  id: string;
  seasonId: string;
  leagueId: string;
  playerAId: string;
  playerBId: string;
  pairKey: string;
  round: number;
  meetingNumber: number;
  status: FixtureStatus;
  createdAt: string;
  updatedAt: string;
  voidedAt: string | null;
  playerAUsername: string | null;
  playerBUsername: string | null;
  resultId: string | null;
  result?: FixtureResultSummary | null;
}

export interface FixtureResultSummary {
  id: string;
  playerALegs: number;
  playerBLegs: number;
  playerAAverage: number;
  playerBAverage: number;
  submittedBy: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'DISPUTED' | null;
  disputeNote: string | null;
  createdAt: string | null;
  confirmedAt: string | null;
}

export interface FixturePreview {
  seasonId: string;
  leagueId: string;
  playerCount: number;
  matchesPerPair: number;
  expectedFixtureCount: number;
  fixtures: Array<{ playerAId: string; playerBId: string; round: number; meetingNumber: number }>;
}

export interface CompetitionMember {
  leagueId: string;
  seasonId: string | null;
  userId: string;
  active: boolean;
  joinedAt: string;
  username: string | null;
  profileImageUrl: string | null;
  email?: string;
  status?: 'ACTIVE' | 'SUSPENDED';
}

export interface UnassignedPlayer {
  id: string;
  username: string | null;
  email: string;
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface SeasonPlacement {
  seasonId: string;
  leagueId: string;
  userId: string;
  active: boolean;
}

export interface AdminCompetitionHealth {
  unassignedPlayers: number;
  outstandingFixtures: number;
  pendingConfirmations: number;
  disputes: number;
}

export interface PromotionMovement {
  id?: string;
  fromSeasonId?: string;
  toSeasonId?: string | null;
  userId: string;
  fromLeagueId: string;
  toLeagueId: string | null;
  fromPosition: number;
  kind: 'PROMOTED' | 'RELEGATED' | 'MANUAL';
  status?: 'PROPOSED' | 'APPROVED' | 'APPLIED';
  reason?: string | null;
  decidedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
  fromLeagueName?: string;
  toLeagueName?: string;
}

export interface PromotionAmbiguity {
  leagueId: string;
  leagueName?: string;
  boundary: 'PROMOTION' | 'RELEGATION';
  position: number;
  tiedUserIds: string[];
}

export interface PromotionProjection {
  seasonId: string;
  provisional: boolean;
  unresolvedCount: number;
  movements: PromotionMovement[];
  ambiguities: PromotionAmbiguity[];
}

export interface MemberMovementRecord extends Omit<PromotionMovement, 'fromLeagueName' | 'toLeagueName'> {
  fromSeasonName: string;
  toSeasonName: string | null;
  fromLeagueName: string;
  toLeagueName: string | null;
}

export interface ResultSummary {
  id: string;
  fixtureId?: string | null;
  leagueId: string;
  playerAId: string;
  playerBId: string;
  playerAUsername: string | null;
  playerBUsername: string | null;
  playerALegs: number;
  playerBLegs: number;
  playerAAverage: number;
  playerBAverage: number;
  submittedBy: string;
  status: 'PENDING' | 'CONFIRMED' | 'DISPUTED';
  confirmedBy: string | null;
  disputeNote: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

export interface ProfileUpdate {
  username?: string;
  dartsCounterUrl?: string | null;
}

export interface AdminClubInvite {
  id: string;
  createdBy?: string;
  expiresAt: string | null;
  uses: number;
  revokedAt: string | null;
  createdAt: string;
}

export interface ResultInput {
  playerAId: string;
  playerBId: string;
  playerALegs: number;
  playerBLegs: number;
  playerAAverage: number;
  playerBAverage: number;
}

export interface FixtureResultInput {
  fixtureId: string;
  playerALegs: number;
  playerBLegs: number;
  playerAAverage: number;
  playerBAverage: number;
}

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value !== null && typeof value === 'object' ? value as JsonRecord : {};
}

function stringValue(row: JsonRecord, ...keys: string[]): string | undefined {
  for (const key of keys) if (typeof row[key] === 'string') return row[key] as string;
  return undefined;
}

function nullableStringValue(row: JsonRecord, ...keys: string[]): string | null | undefined {
  for (const key of keys) {
    if (row[key] === null) return null;
    if (typeof row[key] === 'string') return row[key] as string;
  }
  return undefined;
}

function numberValue(row: JsonRecord, ...keys: string[]): number | undefined {
  for (const key of keys) if (typeof row[key] === 'number' && Number.isFinite(row[key])) return row[key] as number;
  return undefined;
}

function booleanValue(row: JsonRecord, ...keys: string[]): boolean | undefined {
  for (const key of keys) {
    if (typeof row[key] === 'boolean') return row[key] as boolean;
    if (typeof row[key] === 'number') return row[key] === 1;
  }
  return undefined;
}

function normalizeSeason(value: unknown): SeasonSummary {
  const row = asRecord(value);
  return {
    id: stringValue(row, 'id') ?? '',
    name: stringValue(row, 'name') ?? '',
    status: (stringValue(row, 'status') ?? 'DRAFT') as SeasonStatus,
    isCurrent: booleanValue(row, 'isCurrent', 'is_current') ?? false,
    createdAt: stringValue(row, 'createdAt', 'created_at') ?? '',
    updatedAt: stringValue(row, 'updatedAt', 'updated_at') ?? '',
    closedAt: nullableStringValue(row, 'closedAt', 'closed_at') ?? null,
  };
}

function normalizeLeague(value: unknown): LeagueSummary {
  const row = asRecord(value);
  const legacyTargetLegs = numberValue(row, 'targetLegs', 'target_legs');
  const maxLegs = numberValue(row, 'maxLegs', 'max_legs') ?? ((legacyTargetLegs ?? 3) * 2) - 1;
  const targetLegs = legacyTargetLegs ?? Math.floor(maxLegs / 2) + 1;
  return {
    id: stringValue(row, 'id') ?? '',
    name: stringValue(row, 'name') ?? '',
    slug: stringValue(row, 'slug') ?? '',
    seasonName: stringValue(row, 'seasonName', 'season_name') ?? '',
    status: (stringValue(row, 'status') ?? 'OPEN') as LeagueSummary['status'],
    maxLegs,
    pointsPerWin: numberValue(row, 'pointsPerWin', 'points_per_win') ?? 2,
    pointsPerDraw: numberValue(row, 'pointsPerDraw', 'points_per_draw') ?? 0,
    pointsPerLoss: numberValue(row, 'pointsPerLoss', 'points_per_loss') ?? 0,
    targetLegs,
    maxPlayers: numberValue(row, 'maxPlayers', 'max_players') ?? 32,
    matchesPerPair: numberValue(row, 'matchesPerPair', 'matches_per_pair') ?? 1,
    createdBy: nullableStringValue(row, 'createdBy', 'created_by'),
    visibility: (stringValue(row, 'visibility') ?? 'PRIVATE') as LeagueSummary['visibility'],
    seasonId: nullableStringValue(row, 'seasonId', 'season_id'),
    hierarchyPosition: numberValue(row, 'hierarchyPosition', 'hierarchy_position'),
    promotionPlaces: numberValue(row, 'promotionPlaces', 'promotion_places'),
    relegationPlaces: numberValue(row, 'relegationPlaces', 'relegation_places'),
    createdAt: stringValue(row, 'createdAt', 'created_at'),
    updatedAt: stringValue(row, 'updatedAt', 'updated_at'),
  };
}

function normalizeMember(value: unknown): CompetitionMember {
  const row = asRecord(value);
  return {
    leagueId: stringValue(row, 'leagueId', 'league_id') ?? '',
    seasonId: nullableStringValue(row, 'seasonId', 'season_id') ?? null,
    userId: stringValue(row, 'userId', 'user_id') ?? '',
    active: booleanValue(row, 'active') ?? false,
    joinedAt: stringValue(row, 'joinedAt', 'joined_at') ?? '',
    username: nullableStringValue(row, 'username') ?? null,
    profileImageUrl: nullableStringValue(row, 'profileImageUrl', 'profile_image_url') ?? null,
    email: stringValue(row, 'email'),
    status: stringValue(row, 'status') as CompetitionMember['status'],
  };
}

function normalizeFixture(value: unknown): FixtureSummary {
  const row = asRecord(value);
  const resultRow = row.result && typeof row.result === 'object' ? row.result as JsonRecord : null;
  return {
    id: stringValue(row, 'id') ?? '',
    seasonId: stringValue(row, 'seasonId', 'season_id') ?? '',
    leagueId: stringValue(row, 'leagueId', 'league_id') ?? '',
    playerAId: stringValue(row, 'playerAId', 'player_a_id') ?? '',
    playerBId: stringValue(row, 'playerBId', 'player_b_id') ?? '',
    pairKey: stringValue(row, 'pairKey', 'pair_key') ?? '',
    round: numberValue(row, 'round') ?? 0,
    meetingNumber: numberValue(row, 'meetingNumber', 'meeting_number') ?? 0,
    status: (stringValue(row, 'status') ?? 'OUTSTANDING') as FixtureStatus,
    createdAt: stringValue(row, 'createdAt', 'created_at') ?? '',
    updatedAt: stringValue(row, 'updatedAt', 'updated_at') ?? '',
    voidedAt: nullableStringValue(row, 'voidedAt', 'voided_at') ?? null,
    playerAUsername: nullableStringValue(row, 'playerAUsername', 'player_a_username') ?? null,
    playerBUsername: nullableStringValue(row, 'playerBUsername', 'player_b_username') ?? null,
    resultId: nullableStringValue(row, 'resultId', 'result_id') ?? null,
    result: resultRow ? {
      id: stringValue(resultRow, 'id') ?? '',
      playerALegs: numberValue(resultRow, 'playerALegs', 'player_a_legs') ?? 0,
      playerBLegs: numberValue(resultRow, 'playerBLegs', 'player_b_legs') ?? 0,
      playerAAverage: numberValue(resultRow, 'playerAAverage', 'player_a_average') ?? 0,
      playerBAverage: numberValue(resultRow, 'playerBAverage', 'player_b_average') ?? 0,
      submittedBy: nullableStringValue(resultRow, 'submittedBy', 'submitted_by') ?? null,
      status: (stringValue(resultRow, 'status') as FixtureResultSummary['status']) ?? null,
      disputeNote: nullableStringValue(resultRow, 'disputeNote', 'dispute_note') ?? null,
      createdAt: nullableStringValue(resultRow, 'createdAt', 'created_at') ?? null,
      confirmedAt: nullableStringValue(resultRow, 'confirmedAt', 'confirmed_at') ?? null,
    } : null,
  };
}

function normalizeMovement(value: unknown): PromotionMovement {
  const row = asRecord(value);
  return {
    id: stringValue(row, 'id'),
    fromSeasonId: stringValue(row, 'fromSeasonId', 'from_season_id'),
    toSeasonId: nullableStringValue(row, 'toSeasonId', 'to_season_id'),
    userId: stringValue(row, 'userId', 'user_id') ?? '',
    fromLeagueId: stringValue(row, 'fromLeagueId', 'from_league_id') ?? '',
    toLeagueId: nullableStringValue(row, 'toLeagueId', 'to_league_id') ?? null,
    fromPosition: numberValue(row, 'fromPosition', 'from_position') ?? 0,
    kind: (stringValue(row, 'kind') ?? 'MANUAL') as PromotionMovement['kind'],
    status: stringValue(row, 'status') as PromotionMovement['status'],
    reason: nullableStringValue(row, 'reason'),
    decidedBy: nullableStringValue(row, 'decidedBy', 'decided_by'),
    createdAt: stringValue(row, 'createdAt', 'created_at'),
    updatedAt: stringValue(row, 'updatedAt', 'updated_at'),
    fromLeagueName: stringValue(row, 'fromLeagueName', 'from_league_name'),
    toLeagueName: stringValue(row, 'toLeagueName', 'to_league_name'),
  };
}

function normalizePromotionProjection(value: unknown): PromotionProjection {
  const row = asRecord(value);
  const movements = Array.isArray(row.movements) ? row.movements.map(normalizeMovement) : [];
  const ambiguities = Array.isArray(row.ambiguities) ? row.ambiguities.map((value) => {
    const ambiguity = asRecord(value);
    return {
      leagueId: stringValue(ambiguity, 'leagueId', 'league_id') ?? '',
      leagueName: stringValue(ambiguity, 'leagueName', 'league_name'),
      boundary: (stringValue(ambiguity, 'boundary') ?? 'PROMOTION') as PromotionAmbiguity['boundary'],
      position: numberValue(ambiguity, 'position') ?? 0,
      tiedUserIds: Array.isArray(ambiguity.tiedUserIds) ? ambiguity.tiedUserIds.filter((id): id is string => typeof id === 'string') : [],
    };
  }) : [];
  return {
    seasonId: stringValue(row, 'seasonId', 'season_id') ?? '',
    provisional: booleanValue(row, 'provisional') ?? false,
    unresolvedCount: numberValue(row, 'unresolvedCount', 'unresolved_count') ?? 0,
    movements,
    ambiguities,
  };
}

function normalizeMemberMovement(value: unknown): MemberMovementRecord {
  const movement = normalizeMovement(value);
  return {
    ...movement,
    fromSeasonName: stringValue(asRecord(value), 'fromSeasonName', 'from_season_name') ?? '',
    toSeasonName: nullableStringValue(asRecord(value), 'toSeasonName', 'to_season_name') ?? null,
    fromLeagueName: movement.fromLeagueName ?? '',
    toLeagueName: movement.toLeagueName ?? null,
  };
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export class ApiClient {
  private async call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    const response = await fetch(path, { ...init, headers, credentials: 'include' });
    const payload = await response.json().catch(() => null) as { error?: { code?: string; message?: string }; [key: string]: unknown } | null;
    if (!response.ok) throw new ApiClientError(response.status, payload?.error?.message ?? 'Request failed', payload?.error?.code);
    return payload as T;
  }

  me() { return this.call<{ user: UserSummary; requiresOnboarding: boolean }>('/api/me'); }
  signIn(credential: string, inviteToken?: string) {
    return this.call<AuthPayload>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify(inviteToken ? { credential, inviteToken } : { credential }),
    });
  }
  setUsername(username: string) { return this.call<AuthPayload>('/api/me/username', { method: 'POST', body: JSON.stringify({ username }) }); }
  logout() { return this.call<{ ok: true }>('/auth/logout', { method: 'POST' }); }
  adminPlayers() { return this.call<{ players: AdminPlayer[] }>('/api/admin/players'); }
  updateAdminPlayer(id: string, changes: AdminPlayerChanges) {
    return this.call<{ player: AdminPlayer }>(`/api/admin/players/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(changes),
    });
  }
  adminClubInvites() { return this.call<{ invites: AdminClubInvite[] }>('/api/admin/club-invites'); }
  createAdminClubInvite(expiresAt?: string | null) {
    return this.call<{ invite: AdminClubInvite & { url: string } }>('/api/admin/club-invites', {
      method: 'POST',
      body: JSON.stringify({ expiresAt: expiresAt ?? null }),
    });
  }
  revokeAdminClubInvite(inviteId: string) {
    return this.call<{ invite: AdminClubInvite }>(`/api/admin/club-invites/${encodeURIComponent(inviteId)}/revoke`, { method: 'POST' });
  }

  profile() { return this.call<{ profile: Pick<UserSummary, 'username' | 'profileImageUrl' | 'dartsCounterUrl'> }>('/api/me/profile'); }
  updateProfile(input: ProfileUpdate) { return this.call<{ profile: UserSummary }>('/api/me/profile', { method: 'PATCH', body: JSON.stringify(input) }); }
  leagues() { return this.call<{ leagues: LeagueSummary[] }>('/api/public/leagues'); }
  myLeagues() { return this.call<{ leagues: LeagueSummary[] }>('/api/me/leagues'); }
  publicLeague(key: string) { return this.call<{ league: LeagueSummary; players: LeaguePlayer[] }>(`/api/public/leagues/${encodeURIComponent(key)}`).then((payload) => ({ ...payload, league: { ...payload.league, players: payload.players } as LeagueDetail })); }
  publicPlayers(key: string) { return this.call<{ players: LeaguePlayer[] }>(`/api/public/leagues/${encodeURIComponent(key)}/players`); }
  standings(leagueId: string) { return this.call<{ standings: StandingRow[] }>(`/api/public/leagues/${encodeURIComponent(leagueId)}/standings`); }
  results(leagueId: string) { return this.call<{ results: ResultSummary[] }>(`/api/public/leagues/${encodeURIComponent(leagueId)}/results`); }
  memberFixtures(leagueId: string) {
    return this.call<{ fixtures: unknown[] }>(`/api/public/leagues/${encodeURIComponent(leagueId)}/fixtures`).then(({ fixtures }) => ({ fixtures: fixtures.map(normalizeFixture) }));
  }
  myResults() { return this.call<{ results: ResultSummary[] }>('/api/me/results'); }
  submitResult(leagueId: string, input: ResultInput) { return this.call<{ result: ResultSummary }>(`/api/leagues/${encodeURIComponent(leagueId)}/results`, { method: 'POST', body: JSON.stringify(input) }); }
  submitFixtureResult(leagueId: string, input: FixtureResultInput) { return this.call<{ result: ResultSummary }>(`/api/leagues/${encodeURIComponent(leagueId)}/results`, { method: 'POST', body: JSON.stringify(input) }); }
  confirmResult(resultId: string) { return this.call<{ result: ResultSummary }>(`/api/results/${encodeURIComponent(resultId)}/confirm`, { method: 'POST' }); }
  disputeResult(resultId: string, note: string) { return this.call<{ result: ResultSummary }>(`/api/results/${encodeURIComponent(resultId)}/dispute`, { method: 'POST', body: JSON.stringify({ note }) }); }

  adminSeasons() {
    return this.call<{ seasons: unknown[] }>('/api/admin/seasons').then(({ seasons }) => ({ seasons: seasons.map(normalizeSeason) }));
  }
  createAdminSeason(input: SeasonInput) {
    return this.call<{ season: unknown }>('/api/admin/seasons', { method: 'POST', body: JSON.stringify(input) }).then(({ season }) => ({ season: normalizeSeason(season) }));
  }
  updateAdminSeason(seasonId: string, input: Partial<SeasonInput>) {
    return this.call<{ season: unknown }>(`/api/admin/seasons/${encodeURIComponent(seasonId)}`, { method: 'PATCH', body: JSON.stringify(input) }).then(({ season }) => ({ season: normalizeSeason(season) }));
  }
  deleteAdminSeason(seasonId: string) { return this.call<{ ok: true }>(`/api/admin/seasons/${encodeURIComponent(seasonId)}`, { method: 'DELETE' }); }
  seasonLeagues(seasonId: string) {
    return this.call<{ leagues: unknown[] }>(`/api/admin/seasons/${encodeURIComponent(seasonId)}/leagues`).then(({ leagues }) => ({ leagues: leagues.map(normalizeLeague) }));
  }
  createSeasonLeague(seasonId: string, input: Partial<LeagueSummary> & { name: string; maxPlayers: number }) {
    return this.call<{ league: unknown }>(`/api/admin/seasons/${encodeURIComponent(seasonId)}/leagues`, { method: 'POST', body: JSON.stringify(input) }).then(({ league }) => ({ league: normalizeLeague(league) }));
  }
  updateCompetitionLeague(leagueId: string, input: Partial<LeagueSummary>) {
    return this.call<{ league: unknown }>(`/api/admin/competition/leagues/${encodeURIComponent(leagueId)}`, { method: 'PATCH', body: JSON.stringify(input) }).then(({ league }) => ({ league: normalizeLeague(league) }));
  }
  deleteCompetitionLeague(leagueId: string) { return this.call<{ ok: true }>(`/api/admin/competition/leagues/${encodeURIComponent(leagueId)}`, { method: 'DELETE' }); }

  seasonUnassigned(seasonId: string) { return this.call<{ users: UnassignedPlayer[] }>(`/api/admin/seasons/${encodeURIComponent(seasonId)}/unassigned`); }
  adminSeasonHealth(seasonId: string) {
    return this.call<{ health: unknown }>(`/api/admin/seasons/${encodeURIComponent(seasonId)}/health`).then(({ health }) => {
      const row = asRecord(health);
      return {
        health: {
          unassignedPlayers: numberValue(row, 'unassignedPlayers', 'unassigned_players') ?? 0,
          outstandingFixtures: numberValue(row, 'outstandingFixtures', 'outstanding_fixtures') ?? 0,
          pendingConfirmations: numberValue(row, 'pendingConfirmations', 'pending_confirmations') ?? 0,
          disputes: numberValue(row, 'disputes') ?? 0,
        } satisfies AdminCompetitionHealth,
      };
    });
  }
  competitionMembers(leagueId: string) {
    return this.call<{ members: unknown[] }>(`/api/admin/competition/leagues/${encodeURIComponent(leagueId)}/members`).then(({ members }) => ({ members: members.map(normalizeMember) }));
  }
  assignSeasonMember(seasonId: string, userId: string, leagueId: string) {
    return this.call<{ membership: SeasonPlacement }>(`/api/admin/seasons/${encodeURIComponent(seasonId)}/members/${encodeURIComponent(userId)}/assign`, { method: 'POST', body: JSON.stringify({ leagueId }) });
  }
  moveSeasonMember(seasonId: string, userId: string, fromLeagueId: string, toLeagueId: string) {
    return this.call<{ membership: SeasonPlacement }>(`/api/admin/seasons/${encodeURIComponent(seasonId)}/members/${encodeURIComponent(userId)}/move`, { method: 'POST', body: JSON.stringify({ fromLeagueId, toLeagueId }) });
  }

  fixturePreview(leagueId: string) { return this.call<{ preview: FixturePreview }>(`/api/admin/competition/leagues/${encodeURIComponent(leagueId)}/fixtures/preview`); }
  fixtures(leagueId: string, status?: FixtureStatus) {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.call<{ fixtures: unknown[] }>(`/api/admin/competition/leagues/${encodeURIComponent(leagueId)}/fixtures${query}`).then(({ fixtures }) => ({ fixtures: fixtures.map(normalizeFixture) }));
  }
  commitFixtures(leagueId: string) {
    return this.call<{ fixtures: unknown[] }>(`/api/admin/competition/leagues/${encodeURIComponent(leagueId)}/fixtures`, { method: 'POST' }).then(({ fixtures }) => ({ fixtures: fixtures.map(normalizeFixture) }));
  }
  resetFixtures(leagueId: string) { return this.call<{ ok: true }>(`/api/admin/competition/leagues/${encodeURIComponent(leagueId)}/fixtures`, { method: 'DELETE' }); }
  setFixtureStatus(fixtureId: string, status: 'VOID' | 'OUTSTANDING') {
    return this.call<{ fixture: unknown }>(`/api/admin/competition/fixtures/${encodeURIComponent(fixtureId)}`, { method: 'PATCH', body: JSON.stringify({ status }) }).then(({ fixture }) => ({ fixture: normalizeFixture(fixture) }));
  }

  promotionPreview(seasonId: string) {
    return this.call<{ preview: unknown }>(`/api/admin/seasons/${encodeURIComponent(seasonId)}/promotion/preview`).then(({ preview }) => ({ preview: normalizePromotionProjection(preview) }));
  }
  memberPromotionPreview(seasonId: string) {
    return this.call<{ preview: unknown }>(`/api/public/seasons/${encodeURIComponent(seasonId)}/promotion`).then(({ preview }) => ({ preview: normalizePromotionProjection(preview) }));
  }
  memberMovementHistory() {
    return this.call<{ movements: unknown[] }>('/api/me/movements').then(({ movements }) => ({ movements: movements.map(normalizeMemberMovement) }));
  }
  createPromotionProposal(fromSeasonId: string, toSeasonId: string) {
    return this.call<{ movements: unknown[] }>(`/api/admin/seasons/${encodeURIComponent(fromSeasonId)}/promotion/proposal`, { method: 'POST', body: JSON.stringify({ toSeasonId }) }).then(({ movements }) => ({ movements: movements.map(normalizeMovement) }));
  }
  overridePromotionMovement(fromSeasonId: string, userId: string, toLeagueId: string, reason: string) {
    return this.call<{ movement: unknown }>(`/api/admin/seasons/${encodeURIComponent(fromSeasonId)}/promotion/${encodeURIComponent(userId)}`, { method: 'PATCH', body: JSON.stringify({ toLeagueId, reason }) }).then(({ movement }) => ({ movement: normalizeMovement(movement) }));
  }
  applyPromotionProposal(fromSeasonId: string, toSeasonId: string) {
    return this.call<{ placements: SeasonPlacement[]; movements: unknown[] }>(`/api/admin/seasons/${encodeURIComponent(fromSeasonId)}/promotion/apply`, { method: 'POST', body: JSON.stringify({ toSeasonId }) }).then(({ placements, movements }) => ({ placements, movements: movements.map(normalizeMovement) }));
  }

  adminLeagues() { return this.call<{ leagues: LeagueSummary[] }>('/api/admin/leagues'); }
  createAdminLeague(input: Partial<LeagueSummary> & { name: string; seasonName: string; maxPlayers: number }) { return this.call<{ league: LeagueSummary }>('/api/admin/leagues', { method: 'POST', body: JSON.stringify(input) }); }
  updateAdminLeague(id: string, input: Partial<LeagueSummary>) { return this.call<{ league: LeagueSummary }>(`/api/admin/leagues/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) }); }
  adminMembers(leagueId: string) { return this.call<{ members: Array<{ userId: string; username: string | null; profileImageUrl: string | null; active: boolean; joinedAt: string }> }>(`/api/admin/leagues/${encodeURIComponent(leagueId)}/members`); }
  updateMember(leagueId: string, userId: string, active: boolean) { return this.call<{ member: { userId: string; active: boolean } }>(`/api/admin/leagues/${encodeURIComponent(leagueId)}/members/${encodeURIComponent(userId)}`, { method: 'PATCH', body: JSON.stringify({ active }) }); }
  adminResults(leagueId: string) { return this.call<{ results: ResultSummary[] }>(`/api/admin/leagues/${encodeURIComponent(leagueId)}/results`); }
  createAdminResult(leagueId: string, input: ResultInput) { return this.call<{ result: ResultSummary }>(`/api/admin/leagues/${encodeURIComponent(leagueId)}/results`, { method: 'POST', body: JSON.stringify(input) }); }
  updateAdminResult(resultId: string, input: ResultInput & { status?: ResultSummary['status']; disputeNote?: string | null }) { return this.call<{ result: ResultSummary }>(`/api/admin/results/${encodeURIComponent(resultId)}`, { method: 'PATCH', body: JSON.stringify(input) }); }
  deleteAdminResult(resultId: string) { return this.call<{ ok: true }>(`/api/admin/results/${encodeURIComponent(resultId)}`, { method: 'DELETE' }); }
}
