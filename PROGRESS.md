# Misfits 501 Progress

**Updated:** 25 August 2026
**Current branch:** `codex/fix-open-issues`
**PR:** #180 `feat: close approved competition backlog`
**Current focus:** exact-head CI after seven test-first review remediations → resolve review threads → reviewed merge → verify main deploy
**Backend/schema/infra change:** Server-owned season readiness, member/public fixture reads, suspension response, movement/history reads, and desktop admin composition; no schema or Cloudflare architecture change
**Production D1 migration required:** NO

## Current approved execution

Read, in order:

1. `AGENTS.md`
2. this `PROGRESS.md`
3. `PRODUCT.md`
4. `VISION.md`
5. `DESIGN.md`
6. `docs/operations/2026-08-24-issue-and-release-status.md`
7. affected code, tests and release workflow

The approved execution branch implements all 26 issues that were open in the reviewed catalogue: #98, #105, #114, #121, #127-129, #131-144, #155, #157-160 and #165. The branch keeps the existing Hono + D1 + React architecture, adds no migration, and preserves Worker authorization for private data and mutations.

The original implementation gate was green at **67 test files / 289 tests**, but later PR review found seven additional defects. Each finding was captured with a failing regression test before its production fix. The first RED run preserved the existing 289 green tests while three new regressions failed; the second RED run preserved 291 green tests while four new regressions failed. The fixes cover promotion-application eligibility, fixture readiness on idempotent commit, caller-scoped movement ambiguity, historical standings preservation, season-level provisional movement state, unavailable public deep links, and the fresh Google suspended-account error code.

Do not merge from the historical local gate. A fresh exact-head repository gate is required after these review-remediation and handoff commits: Wrangler types, both TypeScript projects, full Vitest suite, production build, Impeccable detector and diff hygiene. The final review must also contain no unresolved blocking finding.

This is source, contract, and review evidence. It is not a deployment, production-health, signed-in Google journey, or rendered-device acceptance claim. Those checks remain post-merge handoff gates.

The earlier club-first release record remains below as historical evidence; it is not the current issue ledger.

## Production baseline already complete

Private-club PR #172 is merged on `main` at merge commit:

`b7a5296665dbbe54eed6572e505ed02404731188`

That release established permanent `PENDING / APPROVED / REJECTED` membership, invite-only admission, Worker-enforced private club data, admin approval/rejection, separation of club membership from season placement, and GitHub Actions as production D1 mutation authority.

Production migration `0006_private_club_membership.sql` was already executed and verified before that merge through GitHub Actions run `32633942454`. PR #174 does not alter the database and must not run a migration.

## Historical club-first release contract

PR #174 replaces the old league-framed signed-in experience with the approved club-first information architecture:

`Home · Record · Leagues · More`

The product rule is:

**Club first. Competition second. Task first.**

### Home

- default signed-in destination;
- compact personal greeting;
- `Your competitions` shows the member's assigned competitions;
- `Needs you` provides a direct task entry point;
- no giant league hero or permanent post-login success strip.

### Record

- zero eligible open assignments → contextual empty state;
- exactly one eligible open assignment → enter that competition's result flow directly;
- more than one eligible open assignment → ask `What are you recording?`;
- existing fixture/result/confirmation/dispute engine remains authoritative.

### Leagues

- browses club competitions an approved member may see;
- opening a competition creates a compact local workspace;
- local tabs are exactly `Table · Fixtures · Results`;
- competition data is content inside the club, not the whole application frame.

### More

- Players;
- Profile;
- Admin for admins;
- Sign out.

The compact header avatar is an explicit Profile shortcut.

## Implementation shape

The simplification boundary is deliberate:

- `App.tsx` continues to own authentication, approved club loading and admin-mode entry;
- `MemberApp.tsx` owns the four club-wide member destinations;
- `MemberNavigation.tsx` owns the exact four-item global member navigation;
- `PlayerLeague.tsx` keeps the proven league/result engine and can render embedded inside Record or the competition workspace;
- `club-app.css` is imported last as the signed-in club-first visual authority;
- obsolete outer-frame components `EmptyMemberWorkspace.tsx` and `LeagueTabs.tsx` were deleted;
- no router, global state library, backend endpoint, D1 migration, dependency or Cloudflare service was added.

Cloudflare remains the existing free-tier Worker + static assets + D1 architecture only.

## Historical club-first TDD and CI evidence

### Initial club-first RED

The first acceptance test proved the old shell could not find Home. The run had **258 passing / 1 failing** test, while TypeScript and Impeccable were clean.

### Functional GREEN

GitHub Actions run `32657735092` proved the first complete club-first behavior:

- Wrangler types: GREEN;
- client + Worker TypeScript: GREEN;
- Impeccable source detector: `[]`;
- **259/259 tests GREEN**;
- production Vite build: GREEN;
- Worker deploy skipped, correctly, because this was a pull request.

### Header Profile RED → GREEN

The header-avatar shortcut was added test-first.

RED run `32657881004` had **259 passing / 1 failing**, solely because `Open profile` was not yet a button. Types and Impeccable were clean.

The implementation then made the compact avatar a real Profile shortcut without adding routing infrastructure. A subsequent PR run completed tests and build successfully.

### Final accessibility RED

A Cave Pony review found that focused Leagues content lost its accessible region name because `aria-labelledby` referenced a heading no longer mounted in focused state.

RED run `32658361834` proved the defect precisely:

- TypeScript: GREEN;
- Impeccable: `[]`;
- **262 tests passing / 1 failing**;
- only failure: unable to find region `Leagues` after opening a competition.

The fix replaces the unstable reference with a stable `aria-label="Leagues"`. A fresh exact-head GREEN run is still required after this documentation checkpoint.

## Cave Pony release review

Cave Pony's simplicity conclusions so far:

- reusing the existing result/scoring engine is safer and smaller than creating a second record implementation;
- no new router/store/service/dependency is justified;
- deleting the obsolete outer league frame is preferable to layering another shell over it;
- one canonical last-loaded signed-in stylesheet is preferable to spreading the redesign across more competing CSS authorities;
- the concrete defects found in review were small: missing test-file newline, a 38px avatar target, and the unstable Leagues region label. The newline is resolved, the avatar is now at least 44px, and the Leagues label has been fixed.

A final diff review is still required after the exact-head GREEN run. Do not merge if it finds a blocking defect.

## Impeccable / responsive authority

`DESIGN.md` has been rewritten to match the club-first product rather than the retired league-first frame.

`club-app.css` provides the final signed-in override layer with:

- compact sticky club header;
- Misfits red for ordinary interaction, green for positive semantic status only;
- mobile safe-area-aware bottom navigation;
- deliberate desktop navigation and composition;
- compact competition rows/workspaces;
- local competition tabs;
- 44px+ key touch targets;
- reduced-motion handling;
- no oversized signed-in league hero.

The repo-local Impeccable detector has remained clean in all cited runs.

This execution environment does not provide a rendered browser/Playwright surface for manual pixel inspection. Do not claim screenshot-perfect acceptance. CI/static responsive rules are release evidence here; rendered device review remains a post-release visual inspection item if needed.

## Historical club-first final release gate

Before merge:

1. Trigger CI for the newest exact PR #174 head.
2. Require Wrangler types GREEN.
3. Require client + Worker TypeScript GREEN.
4. Require Impeccable detector `[]`.
5. Require all tests GREEN, including club-first Record, Profile shortcut and stable Leagues region acceptance.
6. Require production Vite build GREEN.
7. Re-fetch PR #174 and confirm the exact head is mergeable.
8. Run the final Cave Pony diff review and require no blocking finding.
9. Mark PR #174 ready for review.
10. Merge using the verified exact head SHA.

After merge:

1. Verify the push-to-`main` CI run.
2. Verify the Cloudflare Worker deploy step succeeds.
3. Smoke-test `https://darts.graingers.agency` production health and privacy-safe signed-out behavior without exposing club data.
4. Record the merge/deploy evidence in the release summary.

## Guardrails

- Cloudflare free tier only: existing Worker + static assets + D1.
- No KV, R2, Durable Objects, Queues, scheduled jobs, background polling or extra application runtime.
- Do not edit applied migrations.
- No D1 migration is part of PR #180.
- Production D1 mutation remains manual GitHub Actions only.
- Preserve same-origin protection, admin/master-admin protection, auditability and competition invariants.
- No private club data may be exposed before Worker-verified `APPROVED` membership.
- Club approval never implies season/league participation.
- The 26 previously open functional stories are implemented on `codex/fix-open-issues`; close them only after the reviewed PR merges and its target runtime is verified. Preserve the superseded-story disposition for #117 and #119.
