ALTER TABLE leagues ADD COLUMN max_legs INTEGER NOT NULL DEFAULT 5 CHECK(max_legs BETWEEN 1 AND 40);
ALTER TABLE leagues ADD COLUMN points_per_draw INTEGER NOT NULL DEFAULT 0 CHECK(points_per_draw BETWEEN 0 AND 100);
ALTER TABLE leagues ADD COLUMN points_per_loss INTEGER NOT NULL DEFAULT 0 CHECK(points_per_loss BETWEEN 0 AND 100);

UPDATE leagues
SET max_legs = (target_legs * 2) - 1;
