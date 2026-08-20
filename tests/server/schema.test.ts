import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('D1 schema', () => {
  it('defines the complete v1 schema', () => {
    const sql = readFileSync('migrations/0001_initial.sql', 'utf8');
    for (const table of ['users', 'sessions', 'leagues', 'league_players', 'matches', 'audit_log']) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
    expect(sql).toContain('google_sub TEXT NOT NULL UNIQUE');
    expect(sql).toContain('username TEXT UNIQUE COLLATE NOCASE');
    expect(sql).toContain("CHECK(role IN ('PLAYER', 'ADMIN'))");
    expect(sql).toContain("CHECK(status IN ('PENDING', 'CONFIRMED', 'DISPUTED'))");
  });

  it('defines the additive v2 migration', () => {
    const sql = readFileSync('migrations/0002_leagues_profiles_invites.sql', 'utf8');
    for (const fragment of ['profile_image_url', 'darts_counter_url', 'max_players', 'matches_per_pair', 'player_a_average', 'player_b_average', 'league_invites']) {
      expect(sql).toContain(fragment);
    }
    expect(sql).toContain('token_hash TEXT NOT NULL UNIQUE');
  });

  it('defines the additive v3 white-label access migration', () => {
    const sql = readFileSync('migrations/0003_white_label_access.sql', 'utf8');
    expect(sql).toContain('is_master_admin');
    expect(sql).toContain("visibility TEXT NOT NULL DEFAULT 'PUBLIC'");
    expect(sql).toContain("CHECK(visibility IN ('PUBLIC', 'PRIVATE'))");
  });
});
