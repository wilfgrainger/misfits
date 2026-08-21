PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS seasons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK(status IN ('DRAFT', 'OPEN', 'CLOSED')) DEFAULT 'DRAFT',
  is_current INTEGER NOT NULL DEFAULT 0 CHECK(is_current IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  closed_at TEXT
);

INSERT OR IGNORE INTO seasons (id, name, status, is_current, created_at, updated_at, closed_at)
SELECT
  'season-' || lower(hex(randomblob(8))),
  season_name,
  CASE WHEN SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) > 0 THEN 'OPEN' ELSE 'CLOSED' END,
  CASE WHEN SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END,
  MIN(created_at),
  MAX(updated_at),
  CASE WHEN SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) = 0 THEN MAX(updated_at) ELSE NULL END
FROM leagues
GROUP BY season_name;

-- If historical data contains more than one open season label, keep only the most recently updated as current.
UPDATE seasons
SET is_current = CASE WHEN id = (
  SELECT id FROM seasons WHERE status = 'OPEN' ORDER BY updated_at DESC, id ASC LIMIT 1
) THEN 1 ELSE 0 END;

CREATE UNIQUE INDEX IF NOT EXISTS idx_seasons_single_current ON seasons(is_current) WHERE is_current = 1;
CREATE INDEX IF NOT EXISTS idx_seasons_status_updated ON seasons(status, updated_at DESC);

ALTER TABLE leagues ADD COLUMN season_id TEXT REFERENCES seasons(id);
ALTER TABLE leagues ADD COLUMN hierarchy_position INTEGER NOT NULL DEFAULT 1 CHECK(hierarchy_position >= 1);
ALTER TABLE leagues ADD COLUMN promotion_places INTEGER NOT NULL DEFAULT 0 CHECK(promotion_places >= 0);
ALTER TABLE leagues ADD COLUMN relegation_places INTEGER NOT NULL DEFAULT 0 CHECK(relegation_places >= 0);

UPDATE leagues
SET season_id = (SELECT seasons.id FROM seasons WHERE seasons.name = leagues.season_name)
WHERE season_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_leagues_season_hierarchy ON leagues(season_id, hierarchy_position, name);

ALTER TABLE league_players ADD COLUMN season_id TEXT REFERENCES seasons(id);
UPDATE league_players
SET season_id = (SELECT leagues.season_id FROM leagues WHERE leagues.id = league_players.league_id)
WHERE season_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_league_players_one_active_per_season
  ON league_players(season_id, user_id)
  WHERE active = 1 AND season_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_league_players_season_league_active
  ON league_players(season_id, league_id, active);

CREATE TABLE IF NOT EXISTS fixtures (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT,
  league_id TEXT NOT NULL REFERENCES leagues(id) ON DELETE RESTRICT,
  player_a_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  player_b_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  pair_key TEXT NOT NULL,
  round INTEGER NOT NULL CHECK(round >= 1),
  meeting_number INTEGER NOT NULL CHECK(meeting_number >= 1),
  status TEXT NOT NULL CHECK(status IN ('OUTSTANDING', 'PENDING_CONFIRMATION', 'CONFIRMED', 'DISPUTED', 'VOID')) DEFAULT 'OUTSTANDING',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  voided_at TEXT,
  CHECK(player_a_id <> player_b_id),
  UNIQUE(league_id, pair_key, meeting_number)
);

CREATE INDEX IF NOT EXISTS idx_fixtures_league_status_round ON fixtures(league_id, status, round, meeting_number);
CREATE INDEX IF NOT EXISTS idx_fixtures_player_a ON fixtures(player_a_id, status, league_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_player_b ON fixtures(player_b_id, status, league_id);

ALTER TABLE matches ADD COLUMN fixture_id TEXT REFERENCES fixtures(id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_one_active_result_per_fixture
  ON matches(fixture_id)
  WHERE fixture_id IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS season_movements (
  id TEXT PRIMARY KEY,
  from_season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT,
  to_season_id TEXT REFERENCES seasons(id) ON DELETE RESTRICT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  from_league_id TEXT NOT NULL REFERENCES leagues(id) ON DELETE RESTRICT,
  to_league_id TEXT REFERENCES leagues(id) ON DELETE RESTRICT,
  from_position INTEGER NOT NULL CHECK(from_position >= 1),
  kind TEXT NOT NULL CHECK(kind IN ('PROMOTED', 'RELEGATED', 'MANUAL')),
  status TEXT NOT NULL CHECK(status IN ('PROPOSED', 'APPROVED', 'APPLIED')) DEFAULT 'PROPOSED',
  reason TEXT,
  decided_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(from_season_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_season_movements_from_status ON season_movements(from_season_id, status, from_league_id);
