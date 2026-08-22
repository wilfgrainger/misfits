from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, found {count}: {old[:100]!r}")
    p.write_text(text.replace(old, new, 1))


# Client league contract: expose the authoritative scoring fields while retaining
# targetLegs as a derived compatibility mirror until Task 8 finishes legacy UI removal.
replace_once(
    "src/client/api.ts",
    "  pointsPerWin: number;\n  targetLegs: number;\n  maxPlayers: number;",
    "  maxLegs: number;\n  pointsPerWin: number;\n  pointsPerDraw: number;\n  pointsPerLoss: number;\n  /** Derived compatibility mirror. New admin writes use maxLegs only. */\n  targetLegs: number;\n  maxPlayers: number;",
)
replace_once(
    "src/client/api.ts",
    "function normalizeLeague(value: unknown): LeagueSummary {\n  const row = asRecord(value);\n  return {",
    "function normalizeLeague(value: unknown): LeagueSummary {\n  const row = asRecord(value);\n  const legacyTargetLegs = numberValue(row, 'targetLegs', 'target_legs');\n  const maxLegs = numberValue(row, 'maxLegs', 'max_legs') ?? ((legacyTargetLegs ?? 3) * 2) - 1;\n  const targetLegs = legacyTargetLegs ?? Math.floor(maxLegs / 2) + 1;\n  return {",
)
replace_once(
    "src/client/api.ts",
    "    pointsPerWin: numberValue(row, 'pointsPerWin', 'points_per_win') ?? 2,\n    targetLegs: numberValue(row, 'targetLegs', 'target_legs') ?? 3,",
    "    maxLegs,\n    pointsPerWin: numberValue(row, 'pointsPerWin', 'points_per_win') ?? 2,\n    pointsPerDraw: numberValue(row, 'pointsPerDraw', 'points_per_draw') ?? 0,\n    pointsPerLoss: numberValue(row, 'pointsPerLoss', 'points_per_loss') ?? 0,\n    targetLegs,",
)

# One shared explanation in the admin desk. Even Best-of formats can exhaust at a draw.
replace_once(
    "src/client/components/AdminCompetitionDeskV2.tsx",
    "function formatExpiry(value: string | null) {\n  if (!value) return 'No expiry';\n  const formatted = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));\n  return `Expires ${formatted.replace('Sept', 'Sep')}`;\n}\n",
    "function formatExpiry(value: string | null) {\n  if (!value) return 'No expiry';\n  const formatted = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));\n  return `Expires ${formatted.replace('Sept', 'Sep')}`;\n}\n\nfunction describeMatchFormat(maxLegs: number) {\n  const legsToWin = Math.floor(maxLegs / 2) + 1;\n  if (maxLegs % 2 === 0) {\n    const drawLegs = maxLegs / 2;\n    return `Best of ${maxLegs}: first to ${legsToWin} wins; ${drawLegs}-${drawLegs} is a draw.`;\n  }\n  return `Best of ${maxLegs}: first to ${legsToWin} wins; no draw.`;\n}\n",
)

replace_once(
    "src/client/components/AdminCompetitionDeskV2.tsx",
    "        pointsPerWin: leagueEdit.pointsPerWin, targetLegs: leagueEdit.targetLegs, visibility: leagueEdit.visibility,",
    "        maxLegs: leagueEdit.maxLegs, pointsPerWin: leagueEdit.pointsPerWin, pointsPerDraw: leagueEdit.pointsPerDraw, pointsPerLoss: leagueEdit.pointsPerLoss, visibility: leagueEdit.visibility,",
)
replace_once(
    "src/client/components/AdminCompetitionDeskV2.tsx",
    "        name: newLeagueName, maxPlayers: 8, matchesPerPair: 1, pointsPerWin: 2, targetLegs: 3, visibility: newVisibility,",
    "        name: newLeagueName, maxPlayers: 8, matchesPerPair: 1, maxLegs: 5, pointsPerWin: 2, pointsPerDraw: 0, pointsPerLoss: 0, visibility: newVisibility,",
)

old_rules = '<label>Matches per pair<input type="number" min="1" value={leagueEdit.matchesPerPair} onChange={(e) => setLeagueEdit({ ...leagueEdit, matchesPerPair: Number(e.target.value) })} /></label><label>Legs to win<input type="number" min="1" value={leagueEdit.targetLegs} onChange={(e) => setLeagueEdit({ ...leagueEdit, targetLegs: Number(e.target.value) })} /></label><label>Points per win<input type="number" min="1" value={leagueEdit.pointsPerWin} onChange={(e) => setLeagueEdit({ ...leagueEdit, pointsPerWin: Number(e.target.value) })} /></label>'
new_rules = '<label>Matches per pair<input type="number" min="1" value={leagueEdit.matchesPerPair} onChange={(e) => setLeagueEdit({ ...leagueEdit, matchesPerPair: Number(e.target.value) })} /></label><div className="rules-panel"><h4>Match & table rules</h4><p className="form-help">{describeMatchFormat(leagueEdit.maxLegs)}</p><div className="form-grid"><label>Best of<input type="number" min="1" max="40" value={leagueEdit.maxLegs} onChange={(e) => setLeagueEdit({ ...leagueEdit, maxLegs: Number(e.target.value) })} /></label><label>Points for win<input type="number" min="0" max="100" value={leagueEdit.pointsPerWin} onChange={(e) => setLeagueEdit({ ...leagueEdit, pointsPerWin: Number(e.target.value) })} /></label><label>Points for draw<input type="number" min="0" max="100" value={leagueEdit.pointsPerDraw} onChange={(e) => setLeagueEdit({ ...leagueEdit, pointsPerDraw: Number(e.target.value) })} /></label><label>Points for loss<input type="number" min="0" max="100" value={leagueEdit.pointsPerLoss} onChange={(e) => setLeagueEdit({ ...leagueEdit, pointsPerLoss: Number(e.target.value) })} /></label></div></div>'
replace_once("src/client/components/AdminCompetitionDeskV2.tsx", old_rules, new_rules)

print("Task 7 admin scoring patch applied")
