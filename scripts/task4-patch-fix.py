from pathlib import Path

path = Path('scripts/task4-patch.py')
text = path.read_text()
old = '''replace(
    "src/server/db/leagues.ts",
    "status, points_per_win, target_legs,",
    "status, max_legs, points_per_win, points_per_draw, points_per_loss, target_legs,",
    4,
)'''
new = '''replace(
    "src/server/db/leagues.ts",
    "`SELECT id, name, slug, season_name, status, points_per_win, target_legs,\\n",
    "`SELECT id, name, slug, season_name, status, max_legs, points_per_win, points_per_draw, points_per_loss, target_legs,\\n",
    4,
)'''
if text.count(old) != 1:
    raise SystemExit(f'expected one broad league SELECT transform, found {text.count(old)}')
path.write_text(text.replace(old, new))
