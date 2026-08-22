# Mobile Experience Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the public and player-facing Misfits 501 UI to match the approved mobile-app mockup while preserving current APIs, auth and competition behaviour.

**Architecture:** Keep the existing React/Worker/D1 boundaries. Restructure only the client composition: one league-first public/player shell, one responsive standings component, and one scoped experience stylesheet layered after the existing admin/base stylesheet. Do not implement parked fixture APIs or alter scoring/data authority.

**Tech Stack:** React 19, TypeScript, CSS, Vitest/Testing Library, Cloudflare Worker/D1 unchanged.

**Spec:** `docs/superpowers/specs/2026-08-22-mobile-experience-reset-design.md`

## Global Constraints

- Approved mockup is the visual target for composition and quality.
- 33 incomplete functional stories remain parked.
- No schema, auth, API authority, router, state framework, component library or Cloudflare service change.
- Primary mobile standings at 320–412px: POS, PLAYER, P, W-D-L, PTS; LEGS/AVG secondary.
- Public hierarchy: club header → league hero → rules → standings → sign-in action → latest results → navigation.
- Minimum 44px touch targets and zero page-level horizontal overflow.
- Green is the normal active accent; red is reserved for destructive/error/dispute states.

---

### Task 1: Pin the experience contract with focused RED tests

**Files:**
- Create: `tests/client/mobile-experience-reset.test.tsx`
- Modify: `tests/client/standings-table.test.tsx`

**Produces:** Regression proof for league-first public hierarchy, compact sign-in placement, app navigation and responsive standings semantics.

- [ ] Add a signed-out App test that mocks one public league and asserts one canonical `Misfits 501` league hero, rules, standings before the Google sign-in action, latest-results empty state and mobile navigation.
- [ ] Extend `StandingsTable` test to require mobile-primary and secondary-stat class ownership without dropping accessible LEGS/AVG table headers.
- [ ] Run the focused tests and confirm the current implementation fails for the intended hierarchy/classes.

### Task 2: Rebuild the public league surface

**Files:**
- Modify: `src/client/App.tsx`
- Create: `src/client/components/AppIcons.tsx`

**Produces:** Mockup-aligned public shell using existing public league, standings, result and Google auth APIs.

- [ ] Replace the signed-out intro-first composition with branded header + selected league hero + rules + standings.
- [ ] Move Google sign-in into a compact action card after standings.
- [ ] Always render Latest results as a meaningful card with data/empty/error states.
- [ ] Add compact share icon/action and truthful metadata only from existing league/detail data.
- [ ] Add capability-safe bottom navigation; unavailable Fixtures is not advertised as usable.

### Task 3: Make standings and signed-in player UI inherit the same product language

**Files:**
- Modify: `src/client/components/StandingsTable.tsx`
- Modify: `src/client/components/PlayerLeague.tsx`

**Produces:** One responsive standings contract and a player surface that no longer drops into the old stacked-workbench visual hierarchy.

- [ ] Mark LEGS/AVG as secondary responsive columns while retaining semantic table access.
- [ ] Replace player section-kicker/heading/rules/tab stack with league hero/rules and app-like navigation using current views.
- [ ] Keep Fixtures capability truthful: the existing inaccessible fixture API remains parked and is not presented as a successfully available public/member feature.
- [ ] Preserve all existing result/profile/player behaviours and server authority.

### Task 4: Implement the visual system and responsive acceptance

**Files:**
- Create: `src/client/mobile-experience.css`
- Modify: `src/client/main.tsx`

**Produces:** Approved green-led dark app composition without disturbing admin styling.

- [ ] Import the scoped stylesheet after `styles.css`.
- [ ] Implement dark layered surfaces, 12–16px card radii, emerald active states, compact branded header, hero/rules/standings/action/results cards and safe-area bottom navigation.
- [ ] Implement 320/375/390/412px rules with 16–20px gutters, no page overflow, responsive standings and 44px targets.
- [ ] Implement 768/960px+ reflow so the same hierarchy expands rather than stretches.
- [ ] Respect reduced motion, focus, selection and accessible contrast.

### Task 5: One bounded quality/verification pass

**Files:**
- Modify only files implicated by findings.
- Update: `PROGRESS.md`

- [ ] Run Impeccable detector/context audit against `src/client` once after the complete build.
- [ ] Batch-fix material findings in one pass; do at most one confirmation round.
- [ ] Run the full repository gate once: Wrangler types, both TypeScript projects, full Vitest, production build.
- [ ] Update `PROGRESS.md` with the final evidence and any browser/screenshot limitation that could not be verified in this harness.
- [ ] Open/ready the PR and merge only from the verified head.
