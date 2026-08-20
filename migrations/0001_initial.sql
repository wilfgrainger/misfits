PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  username TEXT UNIQUE COLLATE NOCASE,
  role TEXT NOT NULL CHECK(role IN ('PLAYER', 'ADMIN')) DEFAULT 'PLAYER',
  status TEXT NOT NULL CHECK(status IN ('ACTIVE', 'SUSPENDED')) DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL,
  last_login_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leagues (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  season_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('OPEN', 'CLOSED')),
  points_per_win INTEGER NOT NULL DEFAULT 2,
  target_legs INTEGER NOT NULL DEFAULT 3,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS league_players (
  league_id TEXT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
  joined_at TEXT NOT NULL,
  PRIMARY KEY (league_id, user_id)
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  league_id TEXT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  player_a_id TEXT NOT NULL REFERENCES users(id),
  player_b_id TEXT NOT NULL REFERENCES users(id),
  player_a_legs INTEGER NOT NULL,
  player_b_legs INTEGER NOT NULL,
  submitted_by TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK(status IN ('PENDING', 'CONFIRMED', 'DISPUTED')),
  confirmed_by TEXT REFERENCES users(id),
  dispute_note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  confirmed_at TEXT,
  CHECK(player_a_id <> player_b_id),
  CHECK(player_a_legs >= 0),
  CHECK(player_b_legs >= 0)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  before_json TEXT,
  after_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_expiry ON sessions(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_league_players_league_active ON league_players(league_id, active);
CREATE INDEX IF NOT EXISTS idx_matches_league_status_created ON matches(league_id, status, created_at);

INSERT OR IGNORE INTO leagues (
  id, name, slug, season_name, status, points_per_win, target_legs, created_at, updated_at
) VALUES (
  'misfits-501', 'Misfits 501', 'misfits-501', '2026', 'OPEN', 2, 3,
  '2026-08-19T00:00:00.000Z', '2026-08-19T00:00:00.000Z'
);
