# Issue and Release Status - 24 August 2026

## Scope and evidence

- Reviewed every GitHub issue in `wilfgrainger/misfits`: **33 open, 118 closed**. Pull requests were reviewed separately.
- Checked `https://darts.graingers.agency`: HTTPS returned `200`, `/api/health` returned `{"ok":true}`, and the public shell carried the expected privacy/security headers. The deployed bundle contains the club-first member-shell markers.
- Reviewed the supplied signed-in and signed-out captures. No Google-authenticated live journey was performed because no member credentials were used.
- Fresh repository gate: Wrangler types, both TypeScript projects, **65 test files / 269 tests**, production Vite build, Impeccable detector (`[]`) and `git diff --check` all passed.

## Closed issue history

| Group | Issues | Status |
| --- | --- | --- |
| Canonical admin stories | #18-91, #93-97, #99, #102-103 | 82 issues closed by the 22 August evidence audit. |
| Canonical player stories | #106-113, #115-116, #118, #120, #122-126, #130, #146-154, #156, #159 | 29 issues closed by the same audit. |
| Canonical public stories | #161-164, #166-167 | 6 historical closures. They no longer prove current public-data behaviour because private-club authority superseded it. |
| Production launch | #2 | Deployment occurred, but the original signed-in Google end-to-end acceptance was not independently observed. |

The closed catalogue is historical evidence, not a reason to reopen current private-club decisions.

## Open issue disposition

| Disposition | Issues | Outcome |
| --- | --- | --- |
| Fixed in this PR | #92, #100, #101, #104, #145 | Promotion ambiguity visibility, season health, destructive fixture confirmation/focus return, 44px admin controls, and submitter-owned pending results. |
| Requires integrity or authorization design | #98, #114, #131-144 | Do not merge casually: #98 changes season readiness enforcement; #114 changes authentication-facing suspension behaviour; #131-144 need a member-scoped fixture read instead of the current admin-only endpoint. |
| Intentionally parked scope | #127-129, #157-160 | Movement/placement policy remains parked by `PROGRESS.md`. |
| Obsolete after club-first navigation | #117, #119 | Home is now the default and Leagues already browses allowed club competitions. |
| Requires product revalidation | #121, #155, #165 | Rules wall, historical archive, and public fixtures conflict with the current product/visibility authority. |
| UI follow-up | #105 | Desktop administration needs a separate rendered design pass, not an opportunistic layout patch. |

## Release and test review

The core release design is proportionate:

1. **No schema change:** pull request verification, merge to `main`, repeat verification, deploy Worker, then production privacy/auth smoke.
2. **Schema change:** additive migration, manually dispatch the D1 workflow with an immutable SHA and typed confirmation, run verification plus pre/post-migration D1 checks, then merge and deploy normally.

This PR removes only avoidable complexity:

- local `deploy` and `db:migrate:remote` scripts, which contradicted the Actions-only production boundary;
- a no-op `git diff --check` from the clean immutable D1-workflow checkout;
- stale README/runbook instructions that advertised local production commands.

It retains the full CI verification gate, main-only serialized deploy, immutable migration source, typed confirmation, production environment, pre/post migration listing, D1 health/schema verification, and no automatic remote migration.

One operational gap remains outside this PR: `main` was not branch-protected during review. Repository owners should decide whether to require pull-request review and `CI / verify` before relying on the release path as the sole final gate.

## UI follow-up

The club-first structure is deployed and matches the intended destinations. The supplied desktop captures identify a focused next pass:

1. Rebalance the desktop canvas so the private entry and club content do not leave unexplained dead vertical space.
2. Recompose the competition workspace header/back/refresh treatment as one deliberate hierarchy.
3. Recheck standings at exact phone and desktop widths; the captured table treatment needs a rendered review for player-name visibility and horizontal containment.

No visual redesign was included here; these observations need a dedicated rendered UI review against `DESIGN.md`.
