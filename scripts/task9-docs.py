from pathlib import Path

MASTER = Path('docs/superpowers/specs/2026-08-21-user-stories.md')
AUDIT = Path('docs/superpowers/evidence/2026-08-21-story-by-story-audit.md')


def replace_story_state(path: Path, story_id: str, old_state: str, new_state: str) -> None:
    lines = path.read_text().splitlines()
    matches = [i for i, line in enumerate(lines) if line.startswith(f'| **{story_id}** |')]
    if len(matches) != 1:
        raise SystemExit(f'{path}: expected one {story_id} row, found {len(matches)}')
    index = matches[0]
    if old_state not in lines[index]:
        raise SystemExit(f'{path}: {story_id} does not contain expected state {old_state!r}')
    lines[index] = lines[index].replace(old_state, new_state, 1)
    path.write_text('\n'.join(lines) + '\n')


replace_story_state(MASTER, 'ADM-024', '**PARTIAL · P0**', '**DELIVERED · P0**')
replace_story_state(MASTER, 'ADM-025', '**PARTIAL · P0**', '**DELIVERED · P0**')
replace_story_state(MASTER, 'ADM-070', '**MISSING · P0**', '**DELIVERED · P0**')

lines = AUDIT.read_text().splitlines()
replacements = {
    'ADM-024': "| ADM-024 | VERIFIED | Authoritative `maxLegs` is persisted per league, derives the winning target, preserves legacy decisive formats, validates even exhausted draws, and is visible/editable as Best-of rather than a second target-legs authority. | Initial RED `ef185521543cd7db715601493fcebdb433502d07` / `32555046374`; Best-of RED `191d8163c9d66cbb5cbf849bf7857449d205e04f` / `32555425552`; persistence RED `7520b4460ab6fe85b7e35fde97fe1597ea1dd629` / `32555672236`; admin UI RED `9f3eacd089f50c772e43c93d1f96a1c1d712cd84` / `32560656189`; player/public RED `05d32241ed5990bb92b5bd128a44b6c9fc4f4a7f` / `32560958867`; final UI GREEN `32561215701`. |",
    'ADM-025': "| ADM-025 | VERIFIED | Win/draw/loss points are persisted and cloned per league, confirmed wins/draws/losses award configured values, consequential scoring changes lock after competition history exists, and the full scoring contract is editable and visible in admin/player/public views. | Initial RED `ef185521543cd7db715601493fcebdb433502d07` / `32555046374`; persistence/rule-lock RED `7520b4460ab6fe85b7e35fde97fe1597ea1dd629` / `32555672236`; standings RED `2b199e852e20904d5728116a3d90410e8ae247df` / `32559458511`; admin UI RED `9f3eacd089f50c772e43c93d1f96a1c1d712cd84` / `32560656189`; player/public RED `05d32241ed5990bb92b5bd128a44b6c9fc4f4a7f` / `32560958867`; final UI GREEN `32561215701`. |",
    'ADM-070': "| ADM-070 | VERIFIED | Competitive standings use Points → total legs won → head-to-head points; two-player direct meetings and 3+ tied-group mini-tables are covered; unresolved equality shares rank; username/player ID are display-only; promotion/relegation consumes authoritative rank and blocks a shared-rank boundary rather than guessing. | Definitive standings RED `2b199e852e20904d5728116a3d90410e8ae247df` / `32559458511`; standings GREEN `32560372522`; promotion authority RED `7b5874829dc09ce4d2eecbc8ff0f620a671ec1dc` / `32560471929`; promotion GREEN `32560541080`; story release test `tests/release/story-adm-070.test.ts`; visible rule GREEN `32561215701`. |",
}
for story_id, replacement in replacements.items():
    matches = [i for i, line in enumerate(lines) if line.startswith(f'| {story_id} |')]
    if len(matches) != 1:
        raise SystemExit(f'{AUDIT}: expected one {story_id} row, found {len(matches)}')
    lines[matches[0]] = replacement

header_old = '## Chunk 4 — results, disputes and standings integrity — VERIFIED THROUGH ADM-069 / ADM-070 REOPENED'
header_new = '## Chunk 4 — results, disputes and standings integrity — VERIFIED THROUGH ADM-070'
if lines.count(header_old) != 1:
    raise SystemExit('audit chunk 4 header did not match expected reopened state')
lines[lines.index(header_old)] = header_new

text = '\n'.join(lines) + '\n'
section = '''\n## Configurable scoring re-audit — PR #17\n\nADM-024, ADM-025 and ADM-070 were deliberately reopened when the club approved Best-of even formats, draw scoring and the sporting tie-break order. They are now re-verified against the expanded acceptance criteria rather than inheriting their earlier decisive-match evidence.\n\n| Task | RED evidence | GREEN evidence |\n|---|---|---|\n| Shared schema/scoring contract | `ef185521543cd7db715601493fcebdb433502d07`, CI `32555046374` | CI `32555367533` |\n| Best-of result validation | `191d8163c9d66cbb5cbf849bf7857449d205e04f`, CI `32555425552` | CI `32555506609` |\n| Persistence / API / rule locks | `7520b4460ab6fe85b7e35fde97fe1597ea1dd629`, CI `32555672236` | CI `32559244717` |\n| W/D/L standings + head-to-head | `2b199e852e20904d5728116a3d90410e8ae247df`, CI `32559458511` | CI `32560372522` |\n| Promotion uses authoritative rank | `7b5874829dc09ce4d2eecbc8ff0f620a671ec1dc`, CI `32560471929` | CI `32560541080` |\n| Admin Match & table rules UI | `9f3eacd089f50c772e43c93d1f96a1c1d712cd84`, CI `32560656189` | CI `32560845059` |\n| Player/public scoring presentation | `05d32241ed5990bb92b5bd128a44b6c9fc4f4a7f`, CI `32560958867` | CI `32561215701` — **238/238 tests across 57 files**, Wrangler types, TypeScript and production build |\n\nThe production release remains separately gated: migration `0005_configurable_match_scoring.sql` must be explicitly applied to production D1 before PR #17 can be merged and deployed. Story verification here means the implementation and automated acceptance evidence are complete; it does not claim the schema change is already live in production.\n'''
if '## Configurable scoring re-audit — PR #17' in text:
    raise SystemExit('re-audit section already exists')
AUDIT.write_text(text + section)

print('Task 9 catalogue and audit updates applied')
