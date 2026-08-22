ALTER TABLE users ADD COLUMN club_status TEXT NOT NULL DEFAULT 'PENDING'
  CHECK(club_status IN ('PENDING', 'APPROVED', 'REJECTED'));

CREATE TABLE IF NOT EXISTS club_invites (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT,
  uses INTEGER NOT NULL DEFAULT 0 CHECK(uses >= 0),
  revoked_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_club_invites_created
  ON club_invites(created_at DESC);

UPDATE users
SET club_status = 'APPROVED'
WHERE role = 'ADMIN'
   OR is_master_admin = 1
   OR EXISTS (
     SELECT 1 FROM league_players
      WHERE league_players.user_id = users.id
        AND league_players.active = 1
   );

UPDATE leagues SET visibility = 'PRIVATE';
