# Club Workspaces Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic landing, member and admin visual treatment with one coherent Misfits 501 club-record system that is mobile-first and intentionally desktop-capable.

**Architecture:** Preserve all routes, data contracts and component behaviour. Restructure the existing React surfaces with semantic wrappers only where needed, then replace the visual system in `styles.css` with token-led responsive compositions: a persuasive public entrance, a member record desk and an administrator workbench.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Cloudflare Worker/D1.

**Spec:** `VISION.md`, `PRODUCT.md`, `DESIGN.md`, `PROGRESS.md` and the active approved records identified by `PROGRESS.md`.

## Global Constraints

- Misfits 501 is one private club retaining many seasons; do not restore multi-club or white-label language.
- Preserve Google-only Worker-verified authentication and every existing client/server contract.
- Keep the supplied artwork intact and do not create unverified brand imagery.
- Use only the existing Cloudflare Worker/static/D1 free-tier architecture; this work requires no schema change.
- Desktop must be a distinct member/admin operating composition, not a widened phone layout.
- Use TDD for new rendered structure and run Impeccable plus Cave Pony review before handoff.

---

### Task 1: Establish durable operating and design authority

**Files:**
- Create: `PRODUCT.md`, `DESIGN.md`
- Modify: `AGENTS.md`, `PROGRESS.md`, `tests/client/repository-contract.test.ts`

- [ ] **Step 1: Write the failing contract test**

```ts
expect(readFileSync('AGENTS.md', 'utf8')).toContain('Do not pin this entry point to a dated spec filename');
expect(readFileSync('AGENTS.md', 'utf8')).toContain('PRODUCT.md');
expect(readFileSync('AGENTS.md', 'utf8')).toContain('DESIGN.md');
```

- [ ] **Step 2: Run the focused test and confirm it fails for the missing durable contract**

Run: `./node_modules/.bin/vitest run tests/client/repository-contract.test.ts`

- [ ] **Step 3: Add product/design records and replace dated-spec precedence with a durable reading protocol**

Use `VISION.md` for stable purpose, `PROGRESS.md` to nominate live work, `PRODUCT.md` for durable facts and `DESIGN.md` for implemented visual decisions.

- [ ] **Step 4: Re-run the focused test**

Run: `./node_modules/.bin/vitest run tests/client/repository-contract.test.ts`

### Task 2: Make public, member and admin surfaces testable as distinct club workspaces

**Files:**
- Modify: `tests/client/public-league.test.tsx`, `tests/client/player-app.test.tsx`, `src/client/App.tsx`, `src/client/components/PlayerLeague.tsx`, `src/client/components/AdminLeagueDesk.tsx`

- [ ] **Step 1: Write failing UI tests for the entrance artwork and workspace landmarks**

```tsx
expect(screen.getByRole('img', { name: 'Misfits 501 club seal' })).toBeTruthy();
expect(screen.getByRole('navigation', { name: 'Member workspace' })).toBeTruthy();
expect(screen.getByRole('navigation', { name: 'Admin workspace' })).toBeTruthy();
```

- [ ] **Step 2: Run the focused UI tests and confirm the new landmarks are absent**

Run: `./node_modules/.bin/vitest run tests/client/public-league.test.tsx tests/client/player-app.test.tsx`

- [ ] **Step 3: Add minimal semantic wrappers and labels without changing requests, mutations or permissions**

Use the existing season and task controls as the navigation sources; do not introduce routing or state machinery.

- [ ] **Step 4: Re-run the focused UI tests**

Run: `./node_modules/.bin/vitest run tests/client/public-league.test.tsx tests/client/player-app.test.tsx`

### Task 3: Replace the visual system and desktop topology

**Files:**
- Modify: `src/client/styles.css`
- Test: `tests/client/repository-contract.test.ts`

- [ ] **Step 1: Write the failing CSS contract test**

```ts
const css = readFileSync('src/client/styles.css', 'utf8');
expect(css).toContain('.member-workbench');
expect(css).toContain('.admin-workbench');
expect(css).toContain('@media (min-width: 960px)');
expect(css).not.toContain('font-family: Inter');
```

- [ ] **Step 2: Run the focused test and confirm it fails on the old system**

Run: `./node_modules/.bin/vitest run tests/client/repository-contract.test.ts`

- [ ] **Step 3: Implement the token-led club system and responsive workbench layouts**

Keep all controls accessible; make the landing seal a real image, use paper-led list/table surfaces, establish navigation rails at desktop and honour reduced motion.

- [ ] **Step 4: Re-run the focused test**

Run: `./node_modules/.bin/vitest run tests/client/repository-contract.test.ts`

### Task 4: Review, evidence and handoff

**Files:**
- Modify: `PROGRESS.md`
- Create: `docs/superpowers/evidence/2026-08-21-club-workspaces-redesign-review.md`

- [ ] **Step 1: Run the deterministic UI detector**

Run: `node .agents/skills/impeccable/scripts/detect.mjs --json src/client`

- [ ] **Step 2: Run focused and repository verification**

Run: `./node_modules/.bin/vitest run && ./node_modules/.bin/tsc -p tsconfig.client.json --noEmit && ./node_modules/.bin/tsc -p tsconfig.worker.json --noEmit && ./node_modules/.bin/vite build && git diff --check`

- [ ] **Step 3: Apply Cave Pony critical review to the final diff**

Record each material finding as actioned, deferred with a trigger or rejected with evidence.

- [ ] **Step 4: Update `PROGRESS.md` with facts only**

Record exact commands/results, detector disposition, review disposition, visual-inspection limits and next handoff.
