# SDD ledger — plan: docs/superpowers/plans/2026-08-21-misfits-weekly-ledger.md

## Workspace

- Isolated workspace: `C:\Users\wilf6\Documents\Codex\2026-08-21\check-githug-access-we-need-to\work\misfits-club-v4-7ff3180-publish` on `codex/implement-misfits-club-v4`.
- This is a dedicated clone created from the supplied archive, not the user's pre-existing checkout.
- Plan/spec commits before implementation: `e864fcf`, `4a0f741`.

## Preflight conflict scan

| Tasks | Shared file or interface | Finding and resolution |
|---|---|---|
| 1 and 2 | `App.tsx`, public standings contract | Task 1 produces the semantic table; Task 2 composes it into the public record. Execute serially; the public red/green test supplies Task 2's behavioural gate. |
| 1 and 3 | `App.tsx`, shared header | Task 2 completes the signed-out composition before Task 3 adds signed-in season context. No shared state is changed in parallel. |
| 2 and 5 | `styles.css`, public surface classes | Task 2 establishes public layout classes; Task 5 consolidates the finished visual system only after Tasks 1–4. |
| 3 and 4 | `styles.css`, account/admin structure | Task 3 provides signed-in context before Task 4 adds the administrative task grid and desktop rail. |
| 4 and 5 | `styles.css`, form and task navigation | Task 4 defines semantic classes and responsive requirements; Task 5 styles their final visual world without altering behaviour. |
| 4 and server routes | private-default contract | The server route already merges existing visibility for updates. The domain create fallback changes to Private; no migration is required and existing stored values are preserved. |

## Rulings

- Ruling: Existing public seasons retain their persisted visibility; new seasons default to Private in both the browser and direct API creation. This protects new club records without silently withdrawing existing public tables. Cost if wrong: an administrator can explicitly change a season's visibility through the retained settings control.
- Ruling: `StandingsTable` accepts an exact `label` instead of constructing one from a `leagueName`. Callers own the accessible wording, which allows public seasons to include season context and member tables to use their existing league label. Cost if wrong: callers must supply a meaningful label; tests cover the public label and later member coverage will cover the member label.
- Ruling: Public task behaviour was recovered into a proper red-green cycle after a specialist made premature uncommitted edits. The agent's implementation was restored to baseline, the public contract was observed failing, and the table/public record was reimplemented from that red test. Cost if wrong: the initial public implementation must receive independent review before the task is recorded complete.

## Task state

- Task 1: complete — public semantic table `453df9c` and member table `96e3a41`; the combined review identified an invite-status regression, which Task 2 fixed and independently re-reviewed clean. Public RED recovery evidence is retained in `task-1-report.md`.
- Task 2: complete — public/Google pass `f682baa`, invite-status preservation fix `e737481`, accessible status regression test `93e8248`. The independent follow-up review of `review-e737481..93e8248.diff` is CLEAN.
- Task 3: complete — signed-in context `74052e9`, review corrections `f0ed5bd`. The fresh follow-up review of `review-74052e9..f0ed5bd.diff` is CLEAN.
- Task 4: checkpointed WIP — the original implementer was deliberately stopped for session handoff after writing the private-default/server and red acceptance tests. The current checkpoint contains `src/server/domain/league.ts` (create-only omitted visibility now resolves `PRIVATE`) plus unverified Task 4 test changes in `tests/client/account-profile.test.tsx`, `tests/client/app-league-create.test.tsx`, `tests/client/player-app.test.tsx`, `tests/domain/league.test.ts`, and `tests/server/league-routes.test.ts`. `AdminLeagueDesk.tsx` and Task 4 CSS have not yet been implemented. Do not claim these WIP tests pass.

## Handoff checkpoint — 2026-08-21

- Branch: `codex/implement-misfits-club-v4`; isolated worktree: `C:\Users\wilf6\Documents\Codex\2026-08-21\check-githug-access-we-need-to\work\misfits-club-v4-7ff3180-publish`.
- The user asked to commit this checkpoint locally for a new session. The next commit intentionally includes the unfinished Task 4 domain change and its test-first contract; it is a handoff/WIP commit, **not** a green release candidate.
- Continue at Task 4 Step 3. Implement only the scoped files in the plan: `src/client/components/AdminLeagueDesk.tsx`, `src/server/domain/league.ts`, `src/client/styles.css`, and the listed Task 4 tests. Preserve `f0ed5bd`'s `.account-context { overflow-wrap: anywhere; }` and the active dark-surface contrast test.
- Required Task 4 behavior: existing stored visibility stays unchanged; new browser and direct-API creation default Private; explicit Public still works; the selected season is shown first; season creation is inside a closed native `details` disclosure; final admin tabs use actual tab/tablist/tabpanel semantics and labels `Season`, `Members & invites`, `Results`, `Club access` with keyboard arrows/Home/End.
- After Task 4, run focused Task 4 tests, typecheck, then create a review package and use a fresh read-only task reviewer. Continue with Task 5 visual consolidation, the full test/typecheck/build/detector gates, built Worker plus local D1 browser inspection at 320/390/desktop, final two-agent visual/usability review, then push the verified branch. Production/main merge has not been authorised or performed in this checkpoint.
- Temporary `.playwright-cli` artifacts were generated by an invalid front-end-only probe and deliberately excluded from the checkpoint; they carry no product evidence.
