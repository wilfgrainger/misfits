PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  username TEXT UNIQUE COLLATE NOCASE,
  role TEXT NOT NULL DEFAULT 'PLAYER' CHECK(role IN ('PLAYER','ADMIN')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','SUSPENDED')),
  created_at TEXT NOT NULL,
  last_login_at TEXT NOT NULL
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE leagues (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  season_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('OPEN','CLOSED')),
  points_per_win INTEGER NOT NULL DEFAULT 2 CHECK(points_per_win >= 0),
  target_legs INTEGER NOT NULL DEFAULT 3 CHECK(target_legs > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE league_players (
  league_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  joined_at TEXT NOT NULL,
  PRIMARY KEY (league_id, user_id),
  FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE matches (
  id TEXT PRIMARY KEY,
  league_id TEXT NOT NULL,
  player_a_id TEXT NOT NULL,
  player_b_id TEXT NOT NULL,
  player_a_legs INTEGER NOT NULL CHECK(player_a_legs >= 0),
  player_b_legs INTEGER NOT NULL CHECK(player_b_legs >= 0),
  submitted_by TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('PENDING','CONFIRMED','DISPUTED')),
  confirmed_by TEXT,
  dispute_note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  confirmed_at TEXT,
  CHECK(player_a_id <> player_b_id),
  FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
  FOREIGN KEY (player_a_id) REFERENCES users(id),
  FOREIGN KEY (player_b_id) REFERENCES users(id),
  FOREIGN KEY (submitted_by) REFERENCES users(id),
  FOREIGN KEY (confirmed_by) REFERENCES users(id)
);

CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  before_json TEXT,
  after_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (actor_user_id) REFERENCES users(id)
);

CREATE INDEX idx_sessions_user_expiry ON sessions(user_id, expires_at);
CREATE INDEX idx_league_players_active ON league_players(league_id, active);
CREATE INDEX idx_matches_league_status_created ON matches(league_id, status, created_at);

INSERT OR IGNORE INTO leagues (
  id, name, slug, season_name, status, points_per_win, target_legs, created_at, updated_at
) VALUES ('misfits-501', 'Misfits 501', 'misfits-501', '2026', 'OPEN', 2, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
