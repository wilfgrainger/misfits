ALTER TABLE users ADD COLUMN is_master_admin INTEGER NOT NULL DEFAULT 0 CHECK(is_master_admin IN (0, 1));

ALTER TABLE leagues ADD COLUMN visibility TEXT NOT NULL DEFAULT 'PUBLIC' CHECK(visibility IN ('PUBLIC', 'PRIVATE'));

CREATE INDEX IF NOT EXISTS idx_leagues_visibility_status ON leagues(visibility, status, updated_at);
