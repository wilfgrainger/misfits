# Task 4 Report: Personal League Membership

## Status

Complete. Personal league lists now require an active `league_players` row for the requesting user. The retired `leagues.created_by` fallback was removed. The MemoryD1 harness now models inactive membership rows as existing `active = 0` rows, so the regression detects removal of the production active predicate. Public league listing, route authentication, response shape, and privacy behavior were unchanged.

## SHA

- Implementation commit: `07e839b` (`fix: derive personal leagues from active membership`)
- Review fix commit: `0a3a212` (`test: model inactive league memberships in D1 harness`)

## Tests

- RED: `./node_modules/.bin/vitest run tests/server/league-routes.test.ts -t "retired ownership"` failed because the inactive legacy creator still received `league-private`.
- GREEN focused: same command passed.
- Mutation check: temporarily removing `AND league_players.active = 1` made the focused test fail with `league-private` present; the production predicate was restored unchanged.
- GREEN server suite: `./node_modules/.bin/vitest run tests/server/league-routes.test.ts` — 10/10 passed.
- Full server suite: `./node_modules/.bin/vitest run tests/server --maxWorkers=1 --no-file-parallelism` — 10 files, 49 tests passed.
- Full client suite: `./node_modules/.bin/vitest run tests/client --maxWorkers=1 --no-file-parallelism` — 10 files, 33 tests passed.
- Full suite: `./node_modules/.bin/vitest run --maxWorkers=1 --no-file-parallelism` — 25 files, 106 tests passed.
- Typecheck: both client and worker `tsc` projects passed.
- Build: `vite build` passed.
- `git diff --check` passed.

## Concerns

The default parallel full run showed timing-sensitive failures in two existing client selection assertions; the client suite and full suite pass with single-worker, no-file-parallel execution. `wrangler types` and `wrangler deploy --dry-run` could not run because the environment terminated their network/approval request. No application test or build failure was observed in the final deterministic runs.
