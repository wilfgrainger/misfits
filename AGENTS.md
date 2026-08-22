# Misfits 501 — Agent Entry Point

Read this before changing code, configuration, migrations, documentation or release workflow. It is a durable operating manual, not a dated delivery brief.

## Authority and reading order

1. `PRODUCT.md` — the core product authority: users, purpose, scope and evidence.
2. `VISION.md` — the enduring strategic, voice and platform guardrail.
3. `DESIGN.md` — the implemented visual system and responsive rules derived from the product and vision.
4. `PROGRESS.md` — mutable release/handoff truth: active work, verification, blockers and next handoff.
5. For architectural or multi-step work, the active approved plan named by `PROGRESS.md`, then the affected code, tests and operations runbook.

Do not pin this entry point to a dated spec filename. Files in `docs/superpowers/specs/`, `plans/` and `evidence/` retain the decision trail. Historical records are context only and must never restore white-label tenancy, player-owned administration or generic League Board language.

## Fast commands

```bash
./node_modules/.bin/vitest run
./node_modules/.bin/tsc -p tsconfig.client.json --noEmit
./node_modules/.bin/tsc -p tsconfig.worker.json --noEmit
./node_modules/.bin/vite build
node .agents/skills/impeccable/scripts/detect.mjs --json src/client
git diff --check
```

## Non-negotiable product boundaries

- Misfits 501 is one private club. It can retain many seasons over time; it is not a multi-club platform.
- The experience is dull Misfits luxury: dark, restrained, specific, mobile-first and equally deliberate in a desktop browser. Never make it look like generic league SaaS.
- DartCounter is the scoring surface. This app records club results; it does not become a live scorer.
- Google Identity Services is the only sign-in method. Browser state is never authorization; the Worker verifies identity and authorizes protected operations.
- Keep supplied brand artwork intact. Do not destructively crop it or use it as low-contrast decoration behind copy.

## Cloudflare free-tier boundary

- Core path: one Cloudflare Worker, static assets and one D1 database.
- Do not add paid Cloudflare services, queues, R2/object storage, Durable Objects, scheduled jobs, background polling, or another runtime service without an explicit product decision.
- Keep secrets in Cloudflare/Wrangler configuration or `.dev.vars`; never commit or log them.
- Add only additive D1 migrations. Never edit an applied migration.
- CI deliberately does not apply remote D1 migrations. Apply and verify a remote additive migration before merging code that depends on it.
- Before a release that materially affects Cloudflare usage, use `docs/operations/cloudflare-free-tier-runbook.md` and compare dashboard measurements with current official Cloudflare limits.

## Risk-proportionate delivery

Use the lightest process that safely fits the change.

### Routine bounded changes

Examples: copy/label corrections, small CSS/layout adjustments, focused bug fixes with an existing flow, test maintenance, documentation, dependency cleanup, and low-risk refactors with no interface or trust-boundary change.

- Read the affected code and durable product/design authority.
- State the intended change briefly; a separate written spec or implementation plan is not required.
- Use focused tests where behaviour can regress.
- Batch coherent edits.
- Run one fresh full repository gate before merge.
- Do not repeatedly seek approval for tasks already covered by the user's approved request unless scope changes materially.

### Architectural, multi-step or high-risk changes

Examples: new subsystems, schema/data-model changes, authentication/authorization changes, migration work, destructive operations, Cloudflare architecture changes, significant interface changes, or a broad release spanning several coupled behaviours.

- Use Superpowers to clarify, design, plan, test, debug, verify and finish the work.
- An approved design/release plan authorizes the implementation tasks inside that scope. Do not re-run approval ceremony for each planned task unless assumptions or scope materially change.
- Expand verification in proportion to risk.

### UI authority

- `DESIGN.md` is the standing UI authority for routine visual work.
- Use the repo-local Impeccable skill for **material** interaction/visual changes, new surfaces, replacement visual worlds, responsive redesigns, or when explicitly requested.
- Do not require a full Impeccable critique/audit/polish cycle for copy changes, tiny CSS corrections, test-only work, or adjustments already directly governed by `DESIGN.md`.

### Simplicity review

- Cave Pony is the simplicity gate for meaningful refactors, architecture changes, dependency/infrastructure proposals, broad cleanup, or when explicitly requested.
- Routine bounded PRs need only an ordinary simplicity self-check. They do not require a formal Cave Pony finding table.
- Never let simplification weaken accessibility, security, authorization, data integrity or durable product truth.

### Handoff

- Update `PROGRESS.md` when release/handoff truth changes: starting or completing a meaningful release, encountering a durable blocker, changing scope, or leaving work for another agent.
- Do not update `PROGRESS.md` after every test, tiny task or documentation checkpoint.

## Boundaries

- **Always:** understand the changed path; preserve semantics, accessibility, authorization and data integrity; test behaviour that can regress; record genuine evidence.
- **Ask first:** schema/data-model changes; new Cloudflare services or architecture; remote D1 migration; secret creation/rotation; destructive production-data operations; material rewrite of product truth; production deployment when it has not already been explicitly requested or approved as part of the release.
- **No extra approval needed once in approved scope:** ordinary dependencies, routine CI/test maintenance, non-destructive refactors, bounded UI changes, and the production deployment step of an explicitly approved release after its required gate is green.
- **Never:** commit secrets; edit applied migrations; automate remote D1 migrations; add paid Cloudflare services or extra runtimes without approval; weaken authorization; discard existing user work; claim a command passed when it did not run.

## Testing and verification

Tests own durable behaviour, not repository history. Keep one clear owner for each contract where practical:

- `tests/domain/` — pure competition and validation invariants.
- `tests/server/` — authentication, authorization, persistence and API behaviour.
- `tests/client/` — user journeys and presentation behaviour.
- `tests/release/` — deployment, schema and operational guardrails that are not already owned elsewhere.

During implementation, run the smallest focused test that proves the changed path. Do **not** run or retrigger the complete CI pipeline after every small edit or documentation checkpoint. Batch coherent low-risk changes, then run one fresh repository gate before review/merge: Wrangler types, both TypeScript projects, full Vitest suite and production build. Expand proof only for material risk such as security, permissions, migrations, destructive operations or data loss.

Do not add story-number tests when an existing domain/server/client test already proves the same acceptance contract. Do not test that a deleted filename stays deleted or that CI has an exact number of jobs. Test the safety or user behaviour that matters.

Report actual output only. If a check is blocked by the environment, record the blocker and do not claim it passed.
