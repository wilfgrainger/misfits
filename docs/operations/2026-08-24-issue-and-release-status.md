# Issue and Release Status - 24 August 2026

## Scope and evidence

- The approved execution branch is `codex/fix-open-issues`, isolated from the unrelated dirty `main` checkout and based on `origin/main` at `5f1d182febcdaad59bf1e978a23e6b63c2374da3`.
- The branch implements the 26 issues that were open in the reviewed catalogue: season-placement integrity, desktop administration, suspension UX, rules visibility, fixture-first member workflows, movement/history, and public fixtures.
- No D1 schema migration, production mutation, deployment, or authenticated live-browser acceptance is claimed by this branch. The existing production baseline remains a separate proof boundary.
- The original implementation gate was **67 test files / 289 tests** plus TypeScript, build, Wrangler types, Impeccable and `git diff --check`. Subsequent PR review found seven additional integrity/UX defects. Each was captured with a failing regression test before its production fix: promotion application eligibility, fixture readiness on idempotent commit, caller-scoped movement ambiguity, historical standings preservation, provisional movement status, failed public deep-link handling, and the suspended Google sign-in error code.
- The first review RED run kept the existing 289 tests green while the three new regression tests failed. The second review RED run kept 291 existing tests green while the four new regression tests failed. A fresh exact-head full CI gate is required after the remediation and handoff documentation commits before merge.

## Closed issue history

| Group | Issues | Status |
| --- | --- | --- |
| Canonical admin stories | #18-91, #93-97, #99, #102-103 | 82 issues closed by the 22 August evidence audit. |
| Canonical player stories | #106-113, #115-116, #118, #120, #122-126, #130, #146-154, #156, #159 | 29 issues closed by the same audit. |
| Canonical public stories | #161-164, #166-167 | 6 historical closures. They no longer prove current public-data behaviour because private-club authority superseded it. |
| Production launch | #2 | Deployment occurred, but the original signed-in Google end-to-end acceptance was not independently observed. |
| Superseded private-club stories | #117, #119 | Closed as not planned on 24 August after the club-first navigation and private-club visibility contract replaced the old requirements. |

The closed catalogue is historical evidence, not a reason to reopen current private-club decisions.

## Open issue disposition

| Disposition | Issues | Outcome in this branch |
| --- | --- | --- |
| Implemented; close after reviewed merge | #98 | Whole-season readiness is server-owned. Active approved players must have exactly one valid placement; invalid, duplicate, and unassigned states block fixture generation and are visible in the admin desk. |
| Implemented; close after reviewed merge | #105 | Administration now has an explicit desktop control-room layout: responsive task rail, sticky desktop navigation, readable content surface, accessible tab semantics, and the same task surface on mobile. |
| Implemented; close after reviewed merge | #114 | Suspended sessions and fresh Google sign-ins fail closed with the same privacy-safe `ACCOUNT_SUSPENDED` explanation and sign-out path. |
| Implemented; close after reviewed merge | #121 | Player-facing rules show best-of/first-to, meetings per opponent, points, and W-D-L scoring. |
| Implemented; close after reviewed merge | #127-129 | Standings expose promotion/relegation zones, movement state, provisional markers, and caller-specific ambiguity at tied boundaries. |
| Implemented; close after reviewed merge | #131-144 | Member-scoped fixture reads, fixture-first result entry, linked result/status context, progress counters, void/pending/disputed states, and server-enforced score rules are in place. Fixture readiness is enforced even on repeated/idempotent commit requests. |
| Implemented; close after reviewed merge | #155 | Past seasons are separated from current competitions and historical league workspaces retain their own standings, fixtures, and results context. Later account-status changes do not erase persisted competition history from standings. |
| Implemented; close after reviewed merge | #157-160 | Provisional and confirmed movement are caller-scoped, named, and explicit about ambiguity or pending next-season placement; applying a saved proposal now aborts if a participant has become ineligible. |
| Implemented; close after reviewed merge | #165 | Public leagues have a separate anonymous fixture board that permits only `PUBLIC` schedules and omits member/account/private result fields. Missing/private shared league links remain in an explicit privacy-safe unavailable state rather than falling through to the private workspace. |

The previously delivered issue set (#92, #100, #101, #104, and #145) remains covered by its earlier reviewed work. Issues #117 and #119 remain historical superseded stories and were already closed as not planned. No current issue is being silently closed from this branch; GitHub issue closure should follow the reviewed PR merge.

## Implementation boundaries

- Existing Hono + D1 + React architecture is preserved.
- No schema or migration change is included.
- Private member fixture endpoints require the authenticated approved club-member boundary; public fixture serialization is a separate allowlisted path.
- Season readiness is checked before fixture preview/generation, including idempotent commits, and is reloaded after admin placement/status operations.
- Current competition browsing and past-season history use separate server/client data paths so closed history does not silently become current Home content.
- Current account eligibility controls future participation and protected actions; it does not retroactively rewrite confirmed historical standings.

## Release and test review

The release path remains proportionate:

1. **No schema change:** pass PR verification, merge to `main`, repeat verification, deploy the Worker through the existing production path, then run production privacy/auth/health smoke checks.
2. **Schema change:** additive migration, manually dispatch the D1 workflow with an immutable SHA and typed confirmation, run pre/post-migration D1 checks, then merge and deploy normally. This branch does not require that path.

The branch retains the existing Actions-only production mutation boundary, main-only serialized deployment, immutable migration source, typed confirmation, D1 health/schema checks, and no automatic remote migration. No production mutation is part of this issue sweep.

One operational decision remains outside the code change: repository owners should require pull-request review and `CI / verify` before relying on the release path as the final gate.

## Handoff

PR #180 is open against `main` with the issue references and this evidence. Seven review findings have been remediated test-first. Require a fresh exact-head CI run and no unresolved blocking review finding before merge. Post-merge CI, the exact deployed Worker SHA, production `/api/health`, privacy-safe signed-out behavior, and a separately authorized signed-in Google journey remain distinct release evidence; do not claim them from the PR gate alone.
