# Misfits Repository Operating Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Misfits self-explanatory for agents and correct the verified mobile/desktop administration and dispute-dialog P1s without changing the database or Cloudflare service footprint.

**Architecture:** Establish one short root authority contract, a durable product vision and a factual handoff record. Keep detailed designs, plans and evidence in their existing folders. Group the administrator browser surface by task with a local tabbed control room and CSS grid only; keep its tightly coupled loading and mutation state in `AdminLeagueDesk`. Implement the one dialog accessibly in place.

**Tech Stack:** TypeScript, React 19, Vite, Vitest, Testing Library, Hono, Cloudflare Workers, D1.

**Spec:** `docs/superpowers/specs/2026-08-21-misfits-repository-operating-model-design.md`

## Global Constraints

- Misfits 501 is one private club with many seasons over time; do not add multi-club tenancy or a one-open-season schema rule.
- Keep one Worker, static assets and D1. Add no paid Cloudflare service, queue, R2, Durable Object, scheduled job, polling or runtime dependency.
- Google Identity Services remains the only sign-in method and Worker-side authorization remains the authority boundary.
- D1 migrations are additive; do not automatically apply remote migrations in CI.
- Use applicable Superpowers skills and Cave Pony critical review for every PR.
- Begin each behavior change with a focused failing test and record actual verification in `PROGRESS.md`.

---

### Task 1: Establish root authority and PR review record

**Files:**
- Create: `VISION.md`, `PROGRESS.md`, `.github/pull_request_template.md`, `tests/client/repository-contract.test.ts`
- Modify: `AGENTS.md`, `README.md`

**Interfaces:** `AGENTS.md` is the entry point; `VISION.md` is durable product truth; `PROGRESS.md` is dated handoff truth; the PR template is a human/agent checklist.

- [x] **Step 1: Write the failing document-contract test**

```ts
expect(readFileSync('AGENTS.md', 'utf8')).toContain('VISION.md');
expect(readFileSync('AGENTS.md', 'utf8')).toContain('PROGRESS.md');
expect(readFileSync('VISION.md', 'utf8')).toContain('one private club');
expect(readFileSync('PROGRESS.md', 'utf8')).toContain('Current branch');
expect(readFileSync('.github/pull_request_template.md', 'utf8')).toContain('Cave Pony');
```

- [x] **Step 2: Run the focused test**

Run: `npx vitest run tests/client/repository-contract.test.ts`
Expected: FAIL because the new files do not yet exist.

- [x] **Step 3: Write the minimum documents**

Replace `AGENTS.md` with the authority map, boundaries, workflow and commands. Create vision/progress/PR template. Remove duplicated agent-contract prose from `README.md` while retaining setup and operations.

- [x] **Step 4: Verify the contract**

Run: `npx vitest run tests/client/repository-contract.test.ts`
Expected: PASS.

### Task 2: Make result dispute a real modal dialog

**Files:**
- Modify: `src/client/components/PlayerLeague.tsx`, `tests/client/player-app.test.tsx`

**Interfaces:** `disputeId` continues to control the dialog. A ref records the originating Dispute button for focus return.

- [x] **Step 1: Write failing dialog tests**

```tsx
fireEvent.click(screen.getByRole('button', { name: 'Dispute' }));
expect(screen.getByRole('dialog', { name: 'Dispute result' })).toBeTruthy();
expect(screen.getByLabelText('What needs checking?')).toHaveFocus();
fireEvent.keyDown(document, { key: 'Escape' });
expect(screen.queryByRole('dialog')).toBeNull();
expect(screen.getByRole('button', { name: 'Dispute' })).toHaveFocus();
```

Add a Tab/Shift+Tab assertion that focus remains in the dialog.

- [x] **Step 2: Run the focused test**

Run: `npx vitest run tests/client/player-app.test.tsx -t "dispute"`
Expected: FAIL because the current sheet has no dialog or keyboard lifecycle.

- [x] **Step 3: Implement the local dialog behavior**

Add dialog ARIA attributes, focus the textarea on open, cycle Tab/Shift+Tab, close on Escape/Cancel, and restore opener focus. Keep API and server behavior unchanged.

- [x] **Step 4: Verify the dialog**

Run: `npx vitest run tests/client/player-app.test.tsx -t "dispute"`
Expected: PASS.

### Task 3: Recompose the administrator control room

**Files:**
- Modify: `src/client/components/AdminLeagueDesk.tsx`, `src/client/styles.css`, `tests/client/player-app.test.tsx`

**Interfaces:** `AdminLeagueDesk` owns API loading/mutations/selection/status. Its conditional task groups are controlled by `adminView`, one of `season`, `members`, `results`, `people`. Extract a panel only when it gains stable local state or can avoid a wide callback/prop surface.

- [x] **Step 1: Write failing control-room tests**

```tsx
expect(screen.getByRole('button', { name: 'Season' })).toBeTruthy();
expect(screen.getByRole('button', { name: 'Members & invites' })).toBeTruthy();
expect(screen.getByRole('heading', { name: 'Create a season' })).toBeTruthy();
expect(screen.queryByRole('heading', { name: 'Result queue' })).toBeNull();
fireEvent.click(screen.getByRole('button', { name: 'Results' }));
expect(screen.getByRole('heading', { name: 'Result queue' })).toBeTruthy();
```

Replace the obsolete direct-component player test with the existing App-level assertion that players cannot see the desk.

- [x] **Step 2: Run the focused test**

Run: `npx vitest run tests/client/player-app.test.tsx -t "control room"`
Expected: FAIL because the current desk renders every operation at once.

- [x] **Step 3: Group task markup without unstable prop plumbing**

Add labelled task controls and show one of season, members/invites, results, or People at a time. Reuse the existing button-navigation pattern rather than claiming full ARIA tab semantics for conditional operational sections. Keep API calls and tightly coupled state in `AdminLeagueDesk`; do not extract thin panel files merely to move a large callback surface. Rename browser copy from league to season where it means a Misfits season; keep API/database names.

- [x] **Step 4: Add responsive layout**

Use one column by default. At `min-width: 681px`, use a two-column grid with a stable season rail and task panel. Add no dependency or stylesheet.

- [x] **Step 5: Verify control room behavior**

Run: `npx vitest run tests/client/player-app.test.tsx tests/client/app-league-create.test.tsx`
Expected: PASS.

### Task 4: Verify and hand off

**Files:**
- Modify: `PROGRESS.md`
- Create: `docs/superpowers/evidence/2026-08-21-misfits-repository-full-review.md`

**Interfaces:** `PROGRESS.md` records actual command output and environment blockers; historical evidence links to the new operating model without being rewritten as current authority.

- [x] **Step 1: Run complete verification**

Run: `npm run typecheck`, `npm test`, `npm run build`, `npx wrangler types`, `npx wrangler deploy --dry-run`, `git diff --check`, and `git status --short`.

- [x] **Step 2: Record real evidence only**

Update progress with completed checks, failures or sandbox blockers. Do not claim deployment, migration or real Google smoke-test completion without direct evidence.

- [x] **Step 3: Apply Cave Pony review disposition**

Review the complete diff. Record actioned/deferred/rejected for every material finding before PR creation.

## Plan self-review

- Spec coverage: Tasks 1–4 cover authority, handoff, PR review, dialog accessibility, responsive control room, platform boundary and evidence.
- No placeholders: each task names files, behavior and proof.
- Scope: no schema/API/cloud service change is included.
