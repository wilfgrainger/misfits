# Misfits 501 Progress

**Updated:** 21 August 2026
**Current branch:** `main` (all changes merged and pushed)
**Base visibility:** origin/main is fetched and synchronized.

## Authority

- Product truth: `PRODUCT.md`.
- Strategic and platform guardrail: `VISION.md`.
- UI authority and implementation rules: `DESIGN.md` and the repo-local Impeccable skill.
- Delivery authority: Superpowers. Simplicity/review gate: Cave Pony.
- Active implementation plan: `docs/superpowers/plans/2026-08-21-repository-simplification-and-release.md`.

## Current state

- One private Misfits club; many seasons over time; DartCounter remains the scoring surface.
- One Cloudflare Worker, static assets and D1; Google-only authentication; remote D1 migrations remain manual.
- The signed-out entrance uses the supplied Misfits seal and the approved line: “Club darts, properly settled.”
- Member and administrator workspaces are mobile-first, with deliberate desktop rails at 960px and above.

## This release branch

- Added a durable agent entry point, product/vision/design records, review template and agent skills.
- Fixed the result-dispute P1: labelled dialog, focus placement/trap, Escape/Cancel and return focus. Result lists are no longer nested incorrectly.
- Simplified the administrator desk by keeping its state local and task-oriented: no prop-drilled component forest.
- Replaced layered visual overrides with one token-led `src/client/styles.css`; it preserves the existing client/server contracts while making the entrance, public record and operational desks one system.
- Corrected stale documentation authority: `PRODUCT.md` now leads AGENTS and README; historical specs retain their decision history only.
- Resolved design critique findings: replaced native `window.confirm` in [AdminLeagueDesk.tsx](file:///c:/Users/wilf6/dev/misfits/src/client/components/AdminLeagueDesk.tsx) with custom styled parchment confirmation modals, added player name truncation in [styles.css](file:///c:/Users/wilf6/dev/misfits/src/client/styles.css) for mobile viewports, and resolved duplicate test keys in [app-league-create.test.tsx](file:///c:/Users/wilf6/dev/misfits/tests/client/app-league-create.test.tsx).

## Audit decisions

- **Actioned:** one canonical stylesheet and durable authority chain.
- **Actioned:** no new dependency, service, schema or Worker boundary was introduced.
- **Actioned:** replaced native confirmations for invite revocation and result deletion with custom accessible modals.
- **Deferred:** authenticated mobile and desktop browser walkthrough. The cloud browser blocks localhost in this environment.
- **Blocked externally:** `npm audit`, `wrangler types` and `wrangler deploy --dry-run` could not obtain managed-environment network approval. No tool-level code failure was reported.

## Fresh verification

- `env IMPECCABLE_NO_UPDATE_CHECK=1 node .agents/skills/impeccable/scripts/detect.mjs --json src/client`: `[]`.
- `./node_modules/.bin/vitest run`: **29 files / 127 tests passed**.
- `./node_modules/.bin/tsc -p tsconfig.client.json --noEmit` and `./node_modules/.bin/tsc -p tsconfig.worker.json --noEmit`: passed.
- `./node_modules/.bin/vite build`: passed.
- `git diff --check`: passed.

## Before release

1. Review the PR diff and the audit evidence.
2. Complete an authenticated mobile and desktop walkthrough on an authorized origin.
3. If a future change needs D1 schema, apply and verify its additive remote migration manually before merging dependent code.
4. Rerun Wrangler type/deploy checks in an environment with Cloudflare network access.
