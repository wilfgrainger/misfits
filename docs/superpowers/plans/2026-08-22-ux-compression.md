# Misfits 501 UX Compression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compress the existing Misfits 501 experience so players, admins and visitors reach their real tasks faster, while preserving the current ledger visual language and leaving all 33 parked incomplete story issues open.

**Architecture:** Keep the current React + Hono + Worker/D1 boundaries. Simplify client composition in place: remove redundant signed-in chrome, reuse the existing scrollable tab treatment, integrate the Results workflow directly into the canonical admin desk, and delete dead client surface/dependencies only after proving they have no production consumer. No new runtime, router, state library, schema or API is introduced.

**Tech Stack:** React, TypeScript, Vite, Vitest, Hono, Cloudflare Workers/D1, repo-local Impeccable tooling.

**Spec:** `docs/superpowers/specs/2026-08-22-ux-compression-design.md`

## Global Constraints

- Keep the 33 incomplete story issues open; this release does not claim them complete.
- Preserve Worker-side authentication/authorization and existing competition invariants.
- Preserve the current Misfits ledger visual language.
- No new router, state framework, component library, backend service, schema migration or Cloudflare product.
- Use RED → GREEN for behavioral changes.
- Use Impeccable before UI handoff and Cave Pony as the final simplicity review.

---

### Task 1: Player chrome, navigation and safe result defaults

**Files:**
- Modify: `src/client/App.tsx`
- Modify: `src/client/components/PlayerLeague.tsx`
- Modify: `src/client/styles.css`
- Test: `tests/client/player-app.test.tsx`
- Test: `tests/client/player-result-rules.test.tsx`

**Interfaces:**
- Consumes: existing `LeagueTabs`, `PlayerLeague`, `.content-tabs`/`.content-tab` responsive patterns.
- Produces: compact signed-in player shell, 44px scrollable member navigation, blank score defaults.

- [ ] **Step 1: Write failing player-shell/navigation tests**

Add assertions that the signed-in player path does not render the redundant season-count account badge, that all six member destinations remain accessible, and that the member navigation uses the scrollable content-tab treatment rather than the narrow segmented treatment.

```tsx
expect(screen.queryByText(/\d+ seasons?/i)).not.toBeInTheDocument();
const nav = screen.getByRole('navigation', { name: /member workspace/i });
expect(nav.className).toContain('content-tabs');
expect(within(nav).getByRole('button', { name: 'Add result' })).toBeVisible();
expect(within(nav).getByRole('button', { name: 'Profile' })).toBeVisible();
```

- [ ] **Step 2: Run focused test and prove RED**

```bash
./node_modules/.bin/vitest run tests/client/player-app.test.tsx
```

Expected: failure on current account badge/navigation structure.

- [ ] **Step 3: Write failing safe-default test**

Assert both leg-score inputs are blank on first entry and become blank again after successful submission, while a recoverable failed submission preserves typed values.

```tsx
expect(screen.getByLabelText('Your legs')).toHaveValue(null);
expect(screen.getByLabelText('Their legs')).toHaveValue(null);
```

- [ ] **Step 4: Run focused result test and prove RED**

```bash
./node_modules/.bin/vitest run tests/client/player-result-rules.test.tsx
```

Expected: current winning-target/zero defaults fail the new assertions.

- [ ] **Step 5: Implement minimal player compression**

In `App.tsx`, remove/compress duplicated signed-in identity/count chrome while preserving selected league/season/state context. In `PlayerLeague.tsx`, render the member nav using the existing scrollable content-tab classes and initialize/reset leg inputs to `''` rather than a valid score.

```tsx
const [playerALegs, setPlayerALegs] = useState('');
const [playerBLegs, setPlayerBLegs] = useState('');
```

Use CSS already established for `.content-tabs`/`.content-tab`; ensure the touch target floor is at least 44px.

- [ ] **Step 6: Run focused tests GREEN**

```bash
./node_modules/.bin/vitest run tests/client/player-app.test.tsx tests/client/player-result-rules.test.tsx
```

- [ ] **Step 7: Commit**

```bash
git add src/client/App.tsx src/client/components/PlayerLeague.tsx src/client/styles.css tests/client/player-app.test.tsx tests/client/player-result-rules.test.tsx
git commit -m "feat: compress player workspace UX"
```

### Task 2: Public error/retry and wording cleanup

**Files:**
- Modify: `src/client/App.tsx`
- Test: `tests/client/public-app.test.tsx`
- Test: `tests/client/player-app.test.tsx`

**Interfaces:**
- Consumes: `ApiClient.leagues()`, existing `error-message`, `action-button`, `PublicLeagueView`.
- Produces: distinct public load-error state with Retry and accurate league-share wording.

- [ ] **Step 1: Write failing public-load tests**

```tsx
expect(await screen.findByRole('alert')).toHaveTextContent(/club table could not be loaded/i);
expect(screen.getByRole('button', { name: /retry/i })).toBeVisible();
```

Also assert a genuine empty successful response does not show the error.

- [ ] **Step 2: Run focused test RED**

```bash
./node_modules/.bin/vitest run tests/client/public-app.test.tsx
```

- [ ] **Step 3: Write failing share-copy assertion**

```tsx
expect(screen.getByRole('button', { name: 'Share league' })).toBeVisible();
expect(screen.queryByRole('button', { name: 'Share season' })).not.toBeInTheDocument();
```

- [ ] **Step 4: Implement public error state and retry**

Track public list loading failure separately from `publicLeagues=[]`; render the existing error style plus a Retry button calling the same loader. Change league-specific share copy to `Share league`. Compress signed-out intro spacing only through existing CSS tokens/classes.

- [ ] **Step 5: Run focused tests GREEN**

```bash
./node_modules/.bin/vitest run tests/client/public-app.test.tsx tests/client/player-app.test.tsx
```

- [ ] **Step 6: Commit**

```bash
git add src/client/App.tsx src/client/styles.css tests/client/public-app.test.tsx tests/client/player-app.test.tsx
git commit -m "feat: clarify public league experience"
```

### Task 3: Canonical admin Results composition

**Files:**
- Modify: `src/client/components/AdminCompetitionDeskV2.tsx`
- Modify: `src/client/components/AdminCompetitionDesk.tsx`
- Test: `tests/client/admin-competition.test.tsx`
- Test: `tests/client/admin-results-workflow.test.tsx`

**Interfaces:**
- Consumes: existing admin task state/navigation and `AdminResultsWorkflow({ leagueId })`.
- Produces: Results rendered through normal React composition; no portal, DOM query, event-capture bridge.

- [ ] **Step 1: Write failing structural test**

Assert selecting Results causes the canonical desk to render `AdminResultsWorkflow` for the selected league without requiring a wrapper portal.

```tsx
await user.click(screen.getByRole('tab', { name: 'Results' }));
expect(await screen.findByText('Enter official fixture result')).toBeVisible();
```

Add a source/structure guard that `AdminCompetitionDesk.tsx` no longer imports `createPortal` or queries `[role="tabpanel"]`.

- [ ] **Step 2: Run focused admin test RED**

```bash
./node_modules/.bin/vitest run tests/client/admin-competition.test.tsx tests/client/admin-results-workflow.test.tsx
```

- [ ] **Step 3: Integrate Results directly**

Import `AdminResultsWorkflow` into the canonical desk and render it directly in the Results panel using the selected league ID.

```tsx
{task === 'results' && selectedLeague && (
  <AdminResultsWorkflow leagueId={selectedLeague.id} />
)}
```

Reduce `AdminCompetitionDesk.tsx` to a simple compatibility re-export/wrapper only if an import boundary still requires it; otherwise make it the canonical component and delete the bridge logic.

- [ ] **Step 4: Run focused tests GREEN**

```bash
./node_modules/.bin/vitest run tests/client/admin-competition.test.tsx tests/client/admin-results-workflow.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/client/components/AdminCompetitionDesk.tsx src/client/components/AdminCompetitionDeskV2.tsx tests/client/admin-competition.test.tsx tests/client/admin-results-workflow.test.tsx
git commit -m "refactor: make admin results normal composition"
```

### Task 4: Admin result labels and secondary-action disclosure

**Files:**
- Modify: `src/client/components/AdminResultsWorkflow.tsx`
- Modify: canonical admin competition desk from Task 3
- Modify: `src/client/styles.css`
- Test: `tests/client/admin-results-workflow.test.tsx`
- Test: `tests/client/admin-competition.test.tsx`

**Interfaces:**
- Consumes: selected `FixtureSummary`, native `<details>/<summary>` if no better existing disclosure exists.
- Produces: player-named result fields and quieter Season/League secondary actions.

- [ ] **Step 1: Write failing named-field test**

```tsx
await user.selectOptions(screen.getByLabelText('Outstanding fixture'), 'fixture-1');
expect(screen.getByLabelText('Alice legs')).toBeVisible();
expect(screen.getByLabelText('Bob legs')).toBeVisible();
```

- [ ] **Step 2: Write failing disclosure test**

Assert ordinary selected season/league settings remain visible while create/copy/destructive maintenance is collapsed under clearly named disclosure controls.

```tsx
expect(screen.getByText('Season settings')).toBeVisible();
expect(screen.getByText('Create or copy season')).toBeVisible();
```

- [ ] **Step 3: Run tests RED**

```bash
./node_modules/.bin/vitest run tests/client/admin-results-workflow.test.tsx tests/client/admin-competition.test.tsx
```

- [ ] **Step 4: Implement player-named labels**

Resolve the selected fixture once and use its player usernames/IDs for labels. Do not alter the payload ordering.

```tsx
const selectedFixture = outstanding.find((fixture) => fixture.id === draft.fixtureId);
const playerALabel = selectedFixture?.playerAUsername ?? 'Player A';
const playerBLabel = selectedFixture?.playerBUsername ?? 'Player B';
```

- [ ] **Step 5: Implement minimal progressive disclosure**

Prefer native `<details>`/`<summary>` using existing styles rather than a new disclosure component. Keep selected entity settings visible. Group only infrequent create/copy/delete actions.

- [ ] **Step 6: Run focused tests GREEN**

```bash
./node_modules/.bin/vitest run tests/client/admin-results-workflow.test.tsx tests/client/admin-competition.test.tsx
```

- [ ] **Step 7: Commit**

```bash
git add src/client/components/AdminResultsWorkflow.tsx src/client/components/AdminCompetitionDesk*.tsx src/client/styles.css tests/client/admin-results-workflow.test.tsx tests/client/admin-competition.test.tsx
git commit -m "feat: simplify admin weekly workflows"
```

### Task 5: Prove and remove dead client surface

**Files:**
- Delete if proven dead: `src/client/components/AdminLeagueDesk.tsx`
- Modify if required: `package.json`
- Modify: package lock file in repository
- Modify/remove tests that import only dead implementation
- Test: complete client suite

**Interfaces:**
- Consumes: repository import graph/search evidence.
- Produces: fewer owned components and dependencies; no behavior change.

- [ ] **Step 1: Prove production import absence**

```bash
grep -R "AdminLeagueDesk" src tests package.json
grep -R "react-router-dom" src tests package.json
grep -R "from 'zod'\|from \"zod\"" src tests package.json
```

Expected: no production consumer for `AdminLeagueDesk`, `react-router-dom` or `zod`; any test-only reference is classified before deletion.

- [ ] **Step 2: Remove only proven dead items**

Delete `AdminLeagueDesk.tsx` only if no production consumer remains. Remove `react-router-dom` and `zod` from dependencies only if neither build tooling nor tests require them indirectly. Update the lock file through the repository's normal package-manager operation.

- [ ] **Step 3: Run client/type/build checks**

```bash
./node_modules/.bin/tsc -p tsconfig.client.json --noEmit
./node_modules/.bin/vitest run tests/client
./node_modules/.bin/vite build
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove dead client surface"
```

### Task 6: Documentation authority alignment

**Files:**
- Modify: `VISION.md`
- Modify: `docs/superpowers/specs/2026-08-21-user-stories.md`
- Modify: `PROGRESS.md`

**Interfaces:**
- Consumes: issue mirror and 22 August validation ledger.
- Produces: one clear authority model: story Markdown for wording/acceptance/priority, GitHub issues for operational state, dated audits for evidence, `PROGRESS.md` for handoff.

- [ ] **Step 1: Align fixture/product authority**

Remove/supersede VISION wording that still treats persisted fixtures as gated. Do not rewrite historical dated specs.

- [ ] **Step 2: Clarify catalogue state authority**

Add a short authority note near the master catalogue status section explaining that per-row historical state labels are not operational completion authority where GitHub issue state/current validation differs.

- [ ] **Step 3: Update `PROGRESS.md`**

Record UX compression implementation branch/PR, completed tasks, remaining review/verification gates, and keep the 33-story count explicit.

- [ ] **Step 4: Commit**

```bash
git add VISION.md docs/superpowers/specs/2026-08-21-user-stories.md PROGRESS.md
git commit -m "docs: simplify product and story authority"
```

### Task 7: Impeccable + Cave Pony + full verification

**Files:**
- Modify only if findings require changes: affected client/tests/docs
- Update: `PROGRESS.md`

**Interfaces:**
- Consumes: completed UX compression candidate.
- Produces: final reviewed PR head with every material finding actioned, deferred with trigger, or rejected with evidence.

- [ ] **Step 1: Run Impeccable detector and focused critique/audit**

```bash
node .agents/skills/impeccable/scripts/detect.mjs --json src/client
```

Review both mobile and desktop changed surfaces. Fix P0/P1 findings with RED → GREEN tests. Record lower-priority findings deliberately.

- [ ] **Step 2: Run Cave Pony final audit**

Check for new abstractions, unnecessary files, duplicated authority, hidden errors, weak touch targets and UX regressions. Remove rather than add where two solutions are equivalent.

- [ ] **Step 3: Run full repository verification**

```bash
npx wrangler types
./node_modules/.bin/tsc -p tsconfig.client.json --noEmit
./node_modules/.bin/tsc -p tsconfig.worker.json --noEmit
./node_modules/.bin/vitest run
./node_modules/.bin/vite build
git diff --check
```

Expected: all checks pass. If the execution environment cannot run a command, use the repository's GitHub Actions verification as the authoritative substitute and record that explicitly.

- [ ] **Step 4: Update final handoff**

`PROGRESS.md` must state the final commit, CI evidence, Cave Pony/Impeccable dispositions, and confirm that the 33 parked story issues remain open unless separately revalidated.

- [ ] **Step 5: Commit and finish PR**

```bash
git add -A
git commit -m "docs: record UX compression verification"
```
