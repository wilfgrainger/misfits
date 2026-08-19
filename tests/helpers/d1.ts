import { readFileSync } from 'node:fs';
import { DatabaseSync, type StatementSync } from 'node:sqlite';

interface BoundStatement {
  _statement: StatementSync;
  _values: unknown[];
  bind(...values: unknown[]): BoundStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ success: true; results: T[] }>;
  run(): Promise<{ success: true; meta: { changes: number; last_row_id: number | null } }>;
}

function wrap(statement: StatementSync, values: unknown[] = []): BoundStatement {
  return {
    _statement: statement,
    _values: values,
    bind(...next: unknown[]) {
      return wrap(statement, next);
    },
    async first<T>() {
      return (statement.get(...values) as T | undefined) ?? null;
    },
    async all<T>() {
      return { success: true, results: statement.all(...values) as T[] };
    },
    async run() {
      const result = statement.run(...values);
      return {
        success: true,
        meta: {
          changes: Number(result.changes),
          last_row_id: result.lastInsertRowid === undefined ? null : Number(result.lastInsertRowid),
        },
      };
    },
  };
}

export function createTestDb(): { db: D1Database; sqlite: DatabaseSync } {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync('migrations/0001_initial.sql', 'utf8'));
  const db = {
    prepare(sql: string) {
      return wrap(sqlite.prepare(sql));
    },
    async batch(statements: BoundStatement[]) {
      sqlite.exec('BEGIN');
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        sqlite.exec('COMMIT');
        return results;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  } as unknown as D1Database;
  return { db, sqlite };
}

export function insertUser(
  sqlite: DatabaseSync,
  user: Partial<{
    id: string;
    googleSub: string;
    email: string;
    username: string | null;
    role: 'PLAYER' | 'ADMIN';
    status: 'ACTIVE' | 'SUSPENDED';
  }> = {},
): void {
  sqlite.prepare(`
    INSERT INTO users (id, google_sub, email, username, role, status, created_at, last_login_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    user.id ?? 'user-1',
    user.googleSub ?? 'google-1',
    user.email ?? 'player@example.test',
    user.username === undefined ? 'Player One' : user.username,
    user.role ?? 'PLAYER',
    user.status ?? 'ACTIVE',
    '2026-08-19T12:00:00.000Z',
    '2026-08-19T12:00:00.000Z',
  );
}
