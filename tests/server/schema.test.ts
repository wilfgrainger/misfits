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
});
