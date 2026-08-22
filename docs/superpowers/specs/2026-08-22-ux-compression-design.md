# Misfits 501 UX Compression Design

**Status:** Approved in-chat design awaiting written-spec review  
**Date:** 22 August 2026  
**Scope:** Player, public and admin experience compression without reopening the 33 parked incomplete stories

## 1. Purpose

Misfits 501 already has an appropriate visual world: dark club-specific presentation, one canonical stylesheet, a readable standings table, explicit competition status and a deliberate desktop admin rail. The next release should not redesign that world. It should remove friction, repeated context and temporary composition machinery so users reach their real club tasks faster.

This design treats Cave Pony as the user:

- a player standing at the board with a phone;
- a club administrator doing weekly competition work;
- a visitor checking the league.

Success means fewer taps, less repeated chrome, safer data entry, clearer failures and less implementation sediment, while preserving server authority, accessibility, competition rules and the Cloudflare free-tier architecture.

## 2. Explicit boundary: the 33 incomplete stories remain parked

The 22 August full story validation remains authoritative for completion state:

- 117 VERIFIED;
- 12 PARTIAL;
- 21 MISSING;
- 33 open GitHub story issues in total.

This UX compression release does **not** claim to complete those 33 stories and must not close their issues merely because nearby UI changes improve presentation.

In particular, the player fixture authority repair, public fixture API, promotion/relegation player surfaces and season-health feature remain separate backlog work unless a tiny change is strictly required to prevent a regression in the UX compression release.

## 3. Design principles

1. Preserve the existing Misfits ledger visual language.
2. Remove before adding.
3. One canonical UI path per task.
4. Weekly actions outrank infrequent settings in visual hierarchy.
5. The user should never have to infer whether an empty state is real data or a swallowed error.
6. Dangerous or consequential data should never be prefilled as if the user had chosen it.
7. Accessibility, Worker-side authorization and existing competition invariants are not simplification targets.
8. No new router, state library, component framework, backend service or Cloudflare product.

## 4. Player experience

### 4.1 Reduce repeated signed-in chrome

The current signed-in player path repeats identity and context across the brand header, account heading, role, season-count badge, context line, league tabs, league heading and rules before the main task.

The release should:

- keep the brand header as the primary identity surface;
- remove or compress the redundant account hero for normal player use;
- keep only context that changes the meaning of the content, such as selected season/league and competition state;
- correct the current badge/count language so league memberships are not labelled as seasons.

The result should bring the table or active task materially higher on a mobile screen without hiding important state.

### 4.2 Mobile member navigation

The six member destinations currently use the segmented-tab treatment, which is not appropriate for the available mobile width and does not meet the intended 44px touch floor everywhere.

Use the existing scrollable tab/navigation treatment already present elsewhere in the product rather than introducing a new component.

Requirements:

- horizontal scrolling when needed;
- minimum 44px touch target height;
- active state remains obvious;
- keyboard semantics remain intact;
- no clipped `Add result` or `Profile` controls.

This release does not yet remove `Add result` as a top-level destination because the fixture-first story cluster is deliberately parked. Its future removal remains part of the fixture-first backlog.

### 4.3 Safer result form defaults

The result form currently opens with a valid win prefilled. That is an unsafe default for competition data.

Change both leg-score fields to start blank on initial entry and after a successful submission. Preserve entered values after recoverable submission failure.

Do not change result-validation rules.

### 4.4 Latent fixture Player A / Player B reversal

The Cave Pony audit identified a latent defect: the UI labels fixture result fields as `Your legs / Their legs`, but the server stores fixture results using the fixture's fixed Player A / Player B ordering. A signed-in Player B could therefore have scores reversed once player fixtures become accessible.

Because the fixture-first player path remains parked and is currently unreachable for normal players, this release will **document and test the invariant only if practical without reopening fixture delivery**. The actual player-fixture implementation must map entered values to fixture participant order before that path is enabled.

The UX compression release must not make the dormant fixture flow more reachable without also solving this mapping.

## 5. Public visitor experience

### 5.1 Explicit public loading failure

The public league-list load currently catches failures and silently replaces them with an empty list. A visitor cannot distinguish `no public leagues` from `the public API failed`.

Introduce one explicit public error state and a Retry action. Reuse the existing error-message/action patterns. No new error framework.

Requirements:

- genuine zero-public-league state remains distinct from load failure;
- Retry reruns the public league load;
- a failed selected-league detail request continues to render a visible error rather than removing the whole public shell.

### 5.2 Public hierarchy and wording

Compress the signed-out intro so the table appears earlier on small screens while keeping the Google sign-in path visible.

Correct copy where it describes the wrong object. In particular, sharing a league-specific URL should say `Share league`, not `Share season`.

No marketing redesign or hero rebuild.

## 6. Admin experience

### 6.1 Remove the Results composition shim

`AdminCompetitionDesk.tsx` currently wraps the main admin desk and uses DOM event capture/querying plus a portal to inject `AdminResultsWorkflow` into the Results tab.

That was a tactical compatibility bridge. It should not remain the canonical architecture.

Integrate `AdminResultsWorkflow` directly into the canonical admin competition component and remove the portal/event-query shim. End state:

- one admin competition desk component owns the task navigation;
- Results is rendered through normal React composition;
- no DOM querying or manual child hiding is required;
- existing server/API boundaries remain unchanged.

If the wrapper becomes unnecessary after direct integration, delete it and rename the canonical component only if doing so reduces total surface without creating import churn.

### 6.2 Admin result-entry clarity

After an outstanding fixture is selected, result inputs should use the actual two player names rather than generic `Player A` and `Player B` labels.

This reduces working-memory load and helps prevent score reversal during manual admin settlement.

No new result model is required.

### 6.3 Progressive disclosure for secondary admin actions

Admin Season and League tasks currently stack normal editing, creation, copying and destructive maintenance in long vertical flows.

Use the smallest existing disclosure pattern available to reduce visual noise from infrequent actions such as:

- create season / copy season structure;
- add league;
- destructive empty-season / empty-league maintenance where appropriate.

Do not hide normal weekly actions or create a new dashboard/card system. The selected entity and its ordinary settings remain visible.

This is presentation-only. Server protections and confirmations remain authoritative.

## 7. Dead UI and dependency cleanup

The audit found likely legacy/dead surface that should be proven before deletion:

- `src/client/components/AdminLeagueDesk.tsx` appears to have no production import;
- `react-router-dom` appears unused in production;
- `zod` appears unused in production.

Before deletion/removal, prove absence of production imports and update or remove tests that exist only to preserve dead implementation rather than current product behavior.

Do not delete historical plans/evidence merely because they reference old components. Historical records remain historical.

Remove a dependency only when package/build/test tooling does not require it indirectly.

## 8. Documentation authority cleanup

The repository currently has multiple documents capable of implying story completion state.

After the issue mirror exists, authority should be simplified:

- `docs/superpowers/specs/2026-08-21-user-stories.md` owns story IDs, wording, acceptance criteria and priority;
- GitHub issues own operational open/closed state;
- dated validation documents remain evidence snapshots;
- `PROGRESS.md` summarises current handoff truth and must not override acceptance wording.

Align `VISION.md` where it still describes fixtures as gated despite the later canonical catalogue explicitly approving persisted fixtures.

Do not rewrite historical dated specs to make history look cleaner than it was.

## 9. Tests and verification

Use RED → GREEN for every behavioral change.

Focused client tests should cover at minimum:

1. mobile/member navigation exposes all destinations using the intended accessible tab treatment;
2. result form leg fields start blank and retain entered values after recoverable failure;
3. public league-load failure is visible and retryable, distinct from a genuine empty public state;
4. league-specific share copy says `Share league`;
5. admin Results is rendered through canonical component composition, with no portal/event-query bridge;
6. admin result labels use selected fixture player names;
7. corrected league/season count wording;
8. removed dependencies/components have no remaining production consumers.

Before merge run the full repository verification required by `AGENTS.md`:

- Wrangler types;
- client and Worker TypeScript;
- complete Vitest suite;
- production build;
- Impeccable detector/critique/audit for changed client surfaces;
- `git diff --check` where the execution environment supports it.

## 10. Non-goals

This release does not:

- implement the 33 parked incomplete stories;
- add player/public fixture APIs;
- implement promotion/relegation player views;
- add season health;
- introduce a router or state framework;
- change scoring, standings or promotion rules;
- change D1 schema;
- add Cloudflare services;
- redesign the brand or replace the current ledger visual language.

## 11. Delivery sequence

1. Add focused RED tests for UX compression behaviors.
2. Simplify player chrome/navigation and safer result defaults.
3. Add public error/retry and wording/hierarchy corrections.
4. Integrate admin Results directly and improve result labels.
5. Apply minimal progressive disclosure to secondary admin actions.
6. Prove and remove dead component/dependencies.
7. Align documentation authorities and update `PROGRESS.md`.
8. Run Impeccable review and full repository verification.
9. Cave Pony final audit: every material finding marked actioned, deferred with trigger, or rejected with evidence.
10. Merge only after the full verified PR head is green.
