import { describe, expect, it } from 'vitest';
import { issueSession } from '../../src/server/auth/session';
import { createCompetitionRoutes } from '../../src/server/routes/competition';

type User = { id: string; username: string; role: 'PLAYER' | 'ADMIN'; status: 'ACTIVE' | 'SUSPENDED'; club_status: 'APPROVED'; is_master_admin: number };
type Session = { token_hash: string; user_id: string; created_at: string; expires_at: string };
type League = { id: string; season_id: string; name: string; slug: string; season_name: string; status: 'OPEN'; points_per_win: number; target_legs: number; created_at: string; updated_at: string; created_by: string; max_players: number; matches_per_pair: number; visibility: 'PRIVATE'; hierarchy_position: number; promotion_places: number; relegation_places: number };
type Membership = { league_id: string; season_id: string; user_id: string; active: number; joined_at: string };
type Fixture = { id: string; season_id: string; league_id: string; player_a_id: string; player_b_id: string; pair_key: string; round: number; meeting_number: number; status: 'OUTSTANDING' | 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'DISPUTED' | 'VOID'; created_at: string; updated_at: string; voided_at: string | null };

class MemoryD1 {
  users = new Map<string, User>(); sessions = new Map<string, Session>(); leagues = new Map<string, League>(); memberships = new Map<string, Membership>(); fixtures = new Map<string, Fixture>();
  prepare(sql: string) { return { bind: (...values: unknown[]) => ({ run: async () => this.run(sql, values), first: async <T>() => this.first<T>(sql, values), all: async <T>() => this.all<T>(sql, values) }), run: async () => this.run(sql, []), first: async <T>() => this.first<T>(sql, []), all: async <T>() => this.all<T>(sql, []) }; }
  async batch(statements: Array<{ run: () => Promise<unknown> }>) { for (const statement of statements) await statement.run(); return []; }
  private async run(sql: string, values: unknown[]) {
    if (sql.includes('INSERT INTO sessions')) { const [token_hash, user_id, created_at, expires_at] = values as string[]; this.sessions.set(token_hash, { token_hash, user_id, created_at, expires_at }); }
    else if (sql.includes('INSERT INTO fixtures')) { const [id, seasonId, leagueId, playerAId, playerBId, pairKey, round, meeting, createdAt, updatedAt] = values as [string,string,string,string,string,string,number,number,string,string]; this.fixtures.set(id, { id, season_id: seasonId, league_id: leagueId, player_a_id: playerAId, player_b_id: playerBId, pair_key: pairKey, round, meeting_number: meeting, status: 'OUTSTANDING', created_at: createdAt, updated_at: updatedAt, voided_at: null }); }
    else if (sql.includes('UPDATE fixtures SET status')) { const [status, updatedAt, voidStatus, voidedAt, id] = values as [Fixture['status'], string, Fixture['status'], string, string]; const row = this.fixtures.get(id)!; row.status = status; row.updated_at = updatedAt; row.voided_at = voidStatus === 'VOID' ? voidedAt : null; }
    else if (sql.includes('DELETE FROM fixtures WHERE league_id')) { const leagueId = String(values[0]); for (const [id, row] of this.fixtures) if (row.league_id === leagueId) this.fixtures.delete(id); }
    return { success: true, meta: { changes: 1 } };
  }
  private async first<T>(sql: string, values: unknown[]): Promise<T | null> {
    if (sql.includes('FROM sessions') && sql.includes('JOIN users')) { const session = this.sessions.get(String(values[0])); const user = session && this.users.get(session.user_id); if (!session || !user || session.expires_at <= String(values[1])) return null; return { ...user, ...session } as T; }
    if (sql.includes('FROM leagues WHERE id')) return (this.leagues.get(String(values[0])) ?? null) as T;
    if (sql.includes('SELECT COUNT(*) AS count FROM fixtures WHERE league_id')) return { count: [...this.fixtures.values()].filter((row) => row.league_id === String(values[0])).length } as T;
    if (sql.includes('SELECT COUNT(*) AS count FROM league_players')) return { count: [...this.memberships.values()].filter((row) => row.league_id === String(values[0]) && row.active === 1).length } as T;
    if (sql.includes('FROM fixtures f') && sql.includes('WHERE f.id')) { const row = this.fixtures.get(String(values[0])); return row ? ({ ...row, player_a_username: this.users.get(row.player_a_id)?.username, player_b_username: this.users.get(row.player_b_id)?.username, result_id: null } as T) : null; }
    if (sql.includes('SELECT COUNT(*) AS count FROM fixtures f')) { const leagueId = String(values[0]); return { count: [...this.fixtures.values()].filter((row) => row.league_id === leagueId && row.status !== 'OUTSTANDING').length } as T; }
    return null;
  }
  private async all<T>(sql: string, values: unknown[]): Promise<{ results: T[] }> {
    if (sql.includes('SELECT lp.user_id') && sql.includes('league_players')) {
      const leagueId = String(values[0]);
      return { results: [...this.memberships.values()].filter((row) => row.league_id === leagueId && row.active === 1 && this.users.get(row.user_id)?.status === 'ACTIVE').map((row) => ({ user_id: row.user_id })) as T[] };
    }
    if (sql.includes('FROM fixtures f')) { const leagueId = String(values[0]); const status = values[1] == null ? null : String(values[1]); return { results: [...this.fixtures.values()].filter((row) => row.league_id === leagueId && (!status || row.status === status)).sort((a,b) => a.round - b.round).map((row) => ({ ...row, player_a_username: this.users.get(row.player_a_id)?.username, player_b_username: this.users.get(row.player_b_id)?.username, result_id: null })) as T[] }; }
    return { results: [] };
  }
}

const now = new Date('2026-08-21T16:30:00.000Z');
function setup() { const db = new MemoryD1(); db.users.set('admin', { id: 'admin', username: 'Admin', role: 'ADMIN', status: 'ACTIVE', club_status: 'APPROVED', is_master_admin: 1 }); for (let i=1;i<=4;i++) db.users.set(`p${i}`, { id: `p${i}`, username: `Player ${i}`, role: 'PLAYER', status: 'ACTIVE', club_status: 'APPROVED', is_master_admin: 0 }); db.leagues.set('l1', { id:'l1', season_id:'s1', name:'Premier', slug:'premier', season_name:'2026/27', status:'OPEN', points_per_win:2, target_legs:3, created_at:now.toISOString(), updated_at:now.toISOString(), created_by:'admin', max_players:8, matches_per_pair:1, visibility:'PRIVATE', hierarchy_position:1, promotion_places:0, relegation_places:0 }); for (let i=1;i<=4;i++) db.memberships.set(`l1:p${i}`, { league_id:'l1', season_id:'s1', user_id:`p${i}`, active:1, joined_at:now.toISOString() }); return { db, env:{ DB:db as never, ASSETS:{} as never, APP_ORIGIN:'https://misfits.test' }, routes:createCompetitionRoutes({ now:()=>now }) }; }
async function cookieFor(db: MemoryD1) { const session=await issueSession(db as never,'admin',now); return `misfits_session=${session.token}`; }
function mutation(cookie:string, body?:unknown, method='POST') { return { method, headers:{ Cookie:cookie, Origin:'https://misfits.test', ...(body===undefined?{}:{'Content-Type':'application/json'}) }, ...(body===undefined?{}:{body:JSON.stringify(body)}) }; }

describe('persisted fixture administration', () => {
  it('previews the complete schedule contract without writing fixtures', async () => {
    const {db,env,routes}=setup(); const cookie=await cookieFor(db);
    const response=await routes.fetch(new Request('https://misfits.test/api/admin/competition/leagues/l1/fixtures/preview',{headers:{Cookie:cookie}}),env,{} as never);
    expect(response.status).toBe(200);
    const payload=await response.json() as { preview:{seasonId:string; leagueId:string; playerCount:number; matchesPerPair:number; expectedFixtureCount:number; fixtures:Array<{playerAId:string;playerBId:string;round:number;meetingNumber:number}>} };
    expect(payload.preview).toMatchObject({ seasonId:'s1', leagueId:'l1', playerCount:4, matchesPerPair:1, expectedFixtureCount:6 });
    expect(payload.preview.fixtures).toHaveLength(6);
    expect(payload.preview.fixtures.every((row)=>row.playerAId!==row.playerBId && row.round>0 && row.meetingNumber===1)).toBe(true);
    expect(db.fixtures.size).toBe(0);
  });

  it('blocks preview before any write when an active membership belongs to a suspended account', async () => {
    const {db,env,routes}=setup(); db.users.get('p4')!.status='SUSPENDED'; const cookie=await cookieFor(db);
    const response=await routes.fetch(new Request('https://misfits.test/api/admin/competition/leagues/l1/fixtures/preview',{headers:{Cookie:cookie}}),env,{} as never);
    expect(response.status).toBe(409); expect(await response.json()).toMatchObject({ error:{ code:'VALIDATION_ERROR' } }); expect(db.fixtures.size).toBe(0);
  });

  it('commits fixtures once and makes repeated generation idempotent', async () => {
    const {db,env,routes}=setup(); const cookie=await cookieFor(db);
    const first=await routes.fetch(new Request('https://misfits.test/api/admin/competition/leagues/l1/fixtures',mutation(cookie)),env,{} as never);
    expect(first.status).toBe(201); const firstFixtures=(await first.json() as {fixtures:Fixture[]}).fixtures; expect(firstFixtures).toHaveLength(6); const ids=firstFixtures.map((row)=>row.id).sort();
    const second=await routes.fetch(new Request('https://misfits.test/api/admin/competition/leagues/l1/fixtures',mutation(cookie)),env,{} as never);
    expect(second.status).toBe(200); expect((await second.json() as {fixtures:Fixture[]}).fixtures.map((row)=>row.id).sort()).toEqual(ids); expect(db.fixtures.size).toBe(6);
  });

  it('persists repeated meetings as distinct durable fixtures', async () => {
    const {db,env,routes}=setup(); db.leagues.get('l1')!.matches_per_pair=2; const cookie=await cookieFor(db);
    const created=await routes.fetch(new Request('https://misfits.test/api/admin/competition/leagues/l1/fixtures',mutation(cookie)),env,{} as never);
    expect(created.status).toBe(201); const fixtures=(await created.json() as {fixtures:Fixture[]}).fixtures; expect(fixtures).toHaveLength(12);
    const pair=fixtures.filter((row)=>row.pair_key==='p1:p2'); expect(pair).toHaveLength(2); expect(new Set(pair.map((row)=>row.id)).size).toBe(2); expect(pair.map((row)=>row.meeting_number).sort()).toEqual([1,2]); expect(new Set(pair.map((row)=>row.round)).size).toBe(2);
  });

  it('lists complete persisted fixtures and filters each operational state without losing rows', async () => {
    const {db,env,routes}=setup(); const cookie=await cookieFor(db);
    const created=await routes.fetch(new Request('https://misfits.test/api/admin/competition/leagues/l1/fixtures',mutation(cookie)),env,{} as never);
    const fixtures=(await created.json() as {fixtures:Fixture[]}).fixtures;
    db.fixtures.get(fixtures[0].id)!.status='PENDING_CONFIRMATION'; db.fixtures.get(fixtures[1].id)!.status='DISPUTED'; db.fixtures.get(fixtures[2].id)!.status='CONFIRMED'; db.fixtures.get(fixtures[3].id)!.status='VOID';
    const all=await routes.fetch(new Request('https://misfits.test/api/admin/competition/leagues/l1/fixtures',{headers:{Cookie:cookie}}),env,{} as never);
    expect((await all.json() as {fixtures:Fixture[]}).fixtures).toHaveLength(6);
    for (const status of ['OUTSTANDING','PENDING_CONFIRMATION','DISPUTED','CONFIRMED','VOID'] as const) {
      const response=await routes.fetch(new Request(`https://misfits.test/api/admin/competition/leagues/l1/fixtures?status=${status}`,{headers:{Cookie:cookie}}),env,{} as never);
      const rows=(await response.json() as {fixtures:Fixture[]}).fixtures;
      expect(rows.length).toBeGreaterThan(0); expect(rows.every((row)=>row.status===status)).toBe(true);
    }
  });

  it('lists by fixture state and supports safe void/restore', async () => {
    const {db,env,routes}=setup(); const cookie=await cookieFor(db);
    const created=await routes.fetch(new Request('https://misfits.test/api/admin/competition/leagues/l1/fixtures',mutation(cookie)),env,{} as never); const fixture=(await created.json() as {fixtures:Fixture[]}).fixtures[0];
    const voided=await routes.fetch(new Request(`https://misfits.test/api/admin/competition/fixtures/${fixture.id}`,mutation(cookie,{status:'VOID'},'PATCH')),env,{} as never); expect((await voided.json() as {fixture:Fixture}).fixture.status).toBe('VOID');
    const listed=await routes.fetch(new Request('https://misfits.test/api/admin/competition/leagues/l1/fixtures?status=VOID',{headers:{Cookie:cookie}}),env,{} as never); expect((await listed.json() as {fixtures:Fixture[]}).fixtures).toHaveLength(1);
    const restored=await routes.fetch(new Request(`https://misfits.test/api/admin/competition/fixtures/${fixture.id}`,mutation(cookie,{status:'OUTSTANDING'},'PATCH')),env,{} as never); expect((await restored.json() as {fixture:Fixture}).fixture.status).toBe('OUTSTANDING');
  });

  it('refuses to restore a fixture that is not currently void', async () => {
    const {db,env,routes}=setup(); const cookie=await cookieFor(db);
    const created=await routes.fetch(new Request('https://misfits.test/api/admin/competition/leagues/l1/fixtures',mutation(cookie)),env,{} as never); const fixture=(await created.json() as {fixtures:Fixture[]}).fixtures[0]; db.fixtures.get(fixture.id)!.status='CONFIRMED';
    const restored=await routes.fetch(new Request(`https://misfits.test/api/admin/competition/fixtures/${fixture.id}`,mutation(cookie,{status:'OUTSTANDING'},'PATCH')),env,{} as never);
    expect(restored.status).toBe(409); expect(await restored.json()).toMatchObject({ error:{ code:'VALIDATION_ERROR' } }); expect(db.fixtures.get(fixture.id)?.status).toBe('CONFIRMED');
  });

  it('replaces an unplayed schedule from the current roster when reset and regenerated', async () => {
    const {db,env,routes}=setup(); const cookie=await cookieFor(db);
    const created=await routes.fetch(new Request('https://misfits.test/api/admin/competition/leagues/l1/fixtures',mutation(cookie)),env,{} as never); const oldIds=new Set((await created.json() as {fixtures:Fixture[]}).fixtures.map((row)=>row.id)); expect(oldIds.size).toBe(6);
    const reset=await routes.fetch(new Request('https://misfits.test/api/admin/competition/leagues/l1/fixtures',mutation(cookie,undefined,'DELETE')),env,{} as never); expect(reset.status).toBe(200); expect(db.fixtures.size).toBe(0);
    db.memberships.get('l1:p4')!.active=0;
    const regenerated=await routes.fetch(new Request('https://misfits.test/api/admin/competition/leagues/l1/fixtures',mutation(cookie)),env,{} as never); expect(regenerated.status).toBe(201);
    const rows=(await regenerated.json() as {fixtures:Fixture[]}).fixtures; expect(rows).toHaveLength(3); expect(rows.every((row)=>!oldIds.has(row.id))).toBe(true); expect(rows.every((row)=>row.player_a_id!=='p4' && row.player_b_id!=='p4')).toBe(true);
  });

  it('allows reset before play but blocks destructive reset after a fixture becomes active', async () => {
    const {db,env,routes}=setup(); const cookie=await cookieFor(db);
    const created=await routes.fetch(new Request('https://misfits.test/api/admin/competition/leagues/l1/fixtures',mutation(cookie)),env,{} as never); const fixture=(await created.json() as {fixtures:Fixture[]}).fixtures[0];
    const reset=await routes.fetch(new Request('https://misfits.test/api/admin/competition/leagues/l1/fixtures',mutation(cookie,undefined,'DELETE')),env,{} as never); expect(reset.status).toBe(200); expect(db.fixtures.size).toBe(0);
    await routes.fetch(new Request('https://misfits.test/api/admin/competition/leagues/l1/fixtures',mutation(cookie)),env,{} as never); const active=[...db.fixtures.values()][0]; active.status='PENDING_CONFIRMATION';
    const blocked=await routes.fetch(new Request('https://misfits.test/api/admin/competition/leagues/l1/fixtures',mutation(cookie,undefined,'DELETE')),env,{} as never); expect(blocked.status).toBe(409); expect(db.fixtures.size).toBe(6); expect(fixture.id).toBeTruthy();
  });
});