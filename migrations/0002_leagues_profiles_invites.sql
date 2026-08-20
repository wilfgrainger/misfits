ALTER TABLE users ADD COLUMN profile_image_url TEXT;
ALTER TABLE users ADD COLUMN darts_counter_url TEXT;

ALTER TABLE leagues ADD COLUMN created_by TEXT REFERENCES users(id);
ALTER TABLE leagues ADD COLUMN max_players INTEGER NOT NULL DEFAULT 32 CHECK(max_players >= 2);
ALTER TABLE leagues ADD COLUMN matches_per_pair INTEGER NOT NULL DEFAULT 1 CHECK(matches_per_pair >= 1);

ALTER TABLE matches ADD COLUMN player_a_average REAL;
ALTER TABLE matches ADD COLUMN player_b_average REAL;
ALTER TABLE matches ADD COLUMN deleted_at TEXT;

CREATE TABLE IF NOT EXISTS league_invites (
  id TEXT PRIMARY KEY,
  league_id TEXT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT,
  uses INTEGER NOT NULL DEFAULT 0 CHECK(uses >= 0),
  revoked_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_league_invites_league ON league_invites(league_id, created_at);
CREATE INDEX IF NOT EXISTS idx_matches_pair ON matches(league_id, player_a_id, player_b_id, deleted_at, status);

UPDATE leagues
SET created_by = (SELECT id FROM users WHERE role = 'ADMIN' ORDER BY created_at ASC, id ASC LIMIT 1)
WHERE id = 'misfits-501' AND created_by IS NULL;
