# Misfits 501 Progress

**Updated:** 23 August 2026  
**Current branch:** `feat/club-first-navigation`  
**PR:** #174 `feat: make member navigation club-first`  
**Current focus:** final exact-head CI → Cave Pony/Impeccable release review → merge → verify main deploy → production smoke  
**Backend/schema/infra change in PR #174:** NONE  
**Production D1 migration required:** NO

## Restart here

Read, in order:

1. `AGENTS.md`
2. this `PROGRESS.md`
3. `PRODUCT.md`
4. `VISION.md`
5. `DESIGN.md`
6. `docs/superpowers/specs/2026-08-23-club-first-navigation-design.md`
7. `docs/superpowers/plans/2026-08-23-club-first-navigation.md`

This file is the current execution-state authority. The Superpowers plan records delivery structure; CI and the latest PR head are the release evidence.

## Production baseline already complete

Private-club PR #172 is merged on `main` at merge commit:

`b7a5296665dbbe54eed6572e505ed02404731188`

That release established permanent `PENDING / APPROVED / REJECTED` membership, invite-only admission, Worker-enforced private club data, admin approval/rejection, separation of club membership from season placement, and GitHub Actions as production D1 mutation authority.

Production migration `0006_private_club_membership.sql` was already executed and verified before that merge through GitHub Actions run `32633942454`. PR #174 does not alter the database and must not run a migration.

## Club-first release contract

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

## TDD and CI evidence

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

## Final release gate

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
- No D1 migration is part of PR #174.
- Production D1 mutation remains manual GitHub Actions only.
- Preserve same-origin protection, admin/master-admin protection, auditability and competition invariants.
- No private club data may be exposed before Worker-verified `APPROVED` membership.
- Club approval never implies season/league participation.
- Keep all **33 parked functional stories** open until separately revalidated.
