# Repository Simplification and Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Misfits repository easy to steer and safe to review by establishing product/UI/process authority, replacing the layered stylesheet with one canonical system, and recording a complete release audit.

**Architecture:** Preserve all Worker routes, D1 schema, API contracts and UI behaviour. Simplify only the operating contract and client presentation layer: `PRODUCT.md` becomes the stable product source, Impeccable owns UI work, Superpowers governs delivery, Cave Pony audits bloat, and `styles.css` becomes a single implementation of `DESIGN.md`.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Hono, Cloudflare Workers/D1.

**Spec:** `PRODUCT.md`, `VISION.md`, `DESIGN.md`, `PROGRESS.md` and this plan.

## Global Constraints

- One private Misfits club, many seasons; no tenancy or white-label restoration.
- Impeccable is the UI authority; Superpowers governs non-UI delivery and hands every UI task to Impeccable; Cave Pony audits for the smallest safe change.
- Do not change D1 schema, Worker authentication/authorization, API contracts, Google sign-in or Cloudflare free-tier architecture.
- Reuse supplied artwork and existing dependencies only.
- Preserve keyboard support, visible focus, touch targets and existing test coverage.

---

### Task 1: Establish the durable authority contract

**Files:**
- Modify: `AGENTS.md`, `PROGRESS.md`, `tests/client/repository-contract.test.ts`

- [x] **Step 1: Write the failing contract test**

```ts
const agents = readFileSync('AGENTS.md', 'utf8');
expect(agents.indexOf('`PRODUCT.md`')).toBeLessThan(agents.indexOf('`VISION.md`'));
expect(agents).toContain('Impeccable is the UI authority');
expect(agents).toContain('Superpowers governs delivery');
expect(agents).toContain('Cave Pony is the simplicity gate');
```

- [x] **Step 2: Run the focused test and confirm the old hierarchy fails**

Run: `./node_modules/.bin/vitest run tests/client/repository-contract.test.ts`

- [x] **Step 3: Make `AGENTS.md` direct agents to product truth first**

Put `PRODUCT.md` first; keep `VISION.md` as strategic guardrail, `DESIGN.md` as the derived visual system, `PROGRESS.md` as mutable branch truth, and active plans as execution detail.

- [x] **Step 4: Re-run the focused test**

Run: `./node_modules/.bin/vitest run tests/client/repository-contract.test.ts`

### Task 2: Replace layered client presentation with one canonical stylesheet

**Files:**
- Modify: `src/client/styles.css`, `tests/client/repository-contract.test.ts`

- [x] **Step 1: Write the failing stylesheet contract**

```ts
const css = readFileSync('src/client/styles.css', 'utf8');
expect(css).toContain('--ink:');
expect(css).toContain('--paper:');
expect(css).toContain('--club-red:');
expect(css).not.toContain('Club record redesign');
expect(css).not.toContain('Misfits 501 club finish');
```

- [x] **Step 2: Run the focused test and confirm the current override stack fails**

Run: `./node_modules/.bin/vitest run tests/client/repository-contract.test.ts`

- [x] **Step 3: Write one token-led stylesheet covering the existing rendered classes**

Keep public entrance, public record, member desk, admin workbench, dialog, forms and desktop rails. Do not alter component state, network calls, text contracts or server code.

- [x] **Step 4: Re-run the focused test and client UI tests**

Run: `./node_modules/.bin/vitest run tests/client/repository-contract.test.ts tests/client/public-league.test.tsx tests/client/player-app.test.tsx`

### Task 3: Record audit, Cave Pony decision and release proof

**Files:**
- Create: `docs/superpowers/evidence/2026-08-21-repository-simplification-audit.md`
- Modify: `PROGRESS.md`

- [x] **Step 1: Run source, Worker and dependency checks**

Run: `./node_modules/.bin/vitest run && ./node_modules/.bin/tsc -p tsconfig.client.json --noEmit && ./node_modules/.bin/tsc -p tsconfig.worker.json --noEmit && ./node_modules/.bin/vite build && node .agents/skills/impeccable/scripts/detect.mjs --json src/client && git diff --check`

- [x] **Step 2: Apply Cave Pony review**

Document each material finding as actioned, deferred with a trigger or rejected with evidence. Do not add a dependency or service to silence a review finding.

- [x] **Step 3: Update branch truth**

Record only fresh command outcomes, the Cloudflare/Worker audit, the blocked dependency-audit request and the remaining release walkthrough.
