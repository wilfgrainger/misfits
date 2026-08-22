from pathlib import Path

path = Path('src/server/db/results.ts')
text = path.read_text()
old = "    league.points_per_win,\n  );"
new = "    scoringRulesForLeague(league),\n  );"
if text.count(old) != 1:
    raise SystemExit(f'expected exactly one legacy standings scoring call, found {text.count(old)}')
path.write_text(text.replace(old, new))
