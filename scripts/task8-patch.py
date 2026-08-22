from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, found {count}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))


def replace_count(path: str, old: str, new: str, expected: int) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != expected:
        raise SystemExit(f"{path}: expected {expected} matches, found {count}: {old[:120]!r}")
    p.write_text(text.replace(old, new))


# Client standings contract mirrors the server's authoritative W-D-L row.
replace_once(
    "src/client/api.ts",
    "  won: number;\n  lost: number;",
    "  won: number;\n  drawn: number;\n  lost: number;",
)

# Member view: use authoritative Best-of values, shared rule copy, and draw-safe outcomes.
replace_once(
    "src/client/components/PlayerLeague.tsx",
    "import { StandingsTable } from './StandingsTable';",
    "import { StandingsTable } from './StandingsTable';\nimport { effectiveMaxLegs, leagueScoringSummary, legsToWin, matchFormatDescription, resultOutcomeLabel, TABLE_TIE_BREAK_DESCRIPTION } from '../scoring';",
)
replace_once(
    "src/client/components/PlayerLeague.tsx",
    "  const isPlayerA = result.playerAId === user.id;\n  const winner = result.playerALegs > result.playerBLegs ? result.playerAUsername : result.playerBUsername;",
    "  const isPlayerA = result.playerAId === user.id;\n  const outcome = resultOutcomeLabel(result.playerALegs, result.playerBLegs, result.playerAUsername, result.playerBUsername);",
)
replace_once(
    "src/client/components/PlayerLeague.tsx",
    "      {result.status === 'CONFIRMED' && winner && <span className=\"result-winner\">Winner: {winner}</span>}",
    "      {result.status === 'CONFIRMED' && <span className=\"result-winner\">{outcome}</span>}",
)
replace_once(
    "src/client/components/PlayerLeague.tsx",
    "export function PlayerLeague({ user, league, onUserSaved }: PlayerLeagueProps) {\n  const [view, setView] = useState<PlayerView>('table');",
    "export function PlayerLeague({ user, league, onUserSaved }: PlayerLeagueProps) {\n  const maxLegs = effectiveMaxLegs(league);\n  const targetLegs = legsToWin(maxLegs);\n  const [view, setView] = useState<PlayerView>('table');",
)
replace_once(
    "src/client/components/PlayerLeague.tsx",
    "  const [playerALegs, setPlayerALegs] = useState(String(league.targetLegs));",
    "  const [playerALegs, setPlayerALegs] = useState(String(targetLegs));",
)
replace_count(
    "src/client/components/PlayerLeague.tsx",
    "setPlayerALegs(String(league.targetLegs));",
    "setPlayerALegs(String(targetLegs));",
    2,
)
replace_once(
    "src/client/components/PlayerLeague.tsx",
    "  }, [league.id, league.targetLegs]);",
    "  }, [league.id, targetLegs]);",
)
replace_once(
    "src/client/components/PlayerLeague.tsx",
    "      </div>\n      <nav className=\"segmented-tabs\" aria-label=\"Member workspace\">",
    "      </div>\n      <div className=\"season-rules-stack\"><p className=\"season-rules\">{leagueScoringSummary(league)}</p><p className=\"form-help\">{TABLE_TIE_BREAK_DESCRIPTION}</p></div>\n      <nav className=\"segmented-tabs\" aria-label=\"Member workspace\">",
)
replace_once(
    "src/client/components/PlayerLeague.tsx",
    "            <p className=\"form-help\">First to {league.targetLegs} leg{league.targetLegs > 1 ? 's' : ''} wins.</p>",
    "            <p className=\"form-help\">{matchFormatDescription(maxLegs)}</p>",
)
replace_count(
    "src/client/components/PlayerLeague.tsx",
    "max={league.targetLegs}",
    "max={targetLegs}",
    2,
)

# Public view uses the same rule vocabulary and never calls a draw a winner.
replace_once(
    "src/client/App.tsx",
    "import { shareLeague, publicLeagueKey } from './share';",
    "import { shareLeague, publicLeagueKey } from './share';\nimport { leagueScoringSummary, resultOutcomeLabel, TABLE_TIE_BREAK_DESCRIPTION } from './scoring';",
)
replace_once(
    "src/client/App.tsx",
    "      <p className=\"season-rules\">First to {league.targetLegs} legs · {league.pointsPerWin} points per win</p>",
    "      <p className=\"season-rules\">{leagueScoringSummary(league)}</p>\n      <p className=\"form-help\">{TABLE_TIE_BREAK_DESCRIPTION}</p>",
)
replace_once(
    "src/client/App.tsx",
    "<div className=\"result-meta\"><span>{result.playerAAverage.toFixed(2)} / {result.playerBAverage.toFixed(2)} avg</span></div></li>",
    "<div className=\"result-meta\"><span>{result.playerAAverage.toFixed(2)} / {result.playerBAverage.toFixed(2)} avg</span></div><span className=\"result-winner\">{resultOutcomeLabel(result.playerALegs, result.playerBLegs, result.playerAUsername, result.playerBUsername)}</span></li>",
)

print("Task 8 player/public scoring patch applied")
