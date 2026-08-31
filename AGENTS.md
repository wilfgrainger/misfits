# Misfits 501 — Agent Entry Point

Read this before changing code, configuration, migrations, documentation or release workflow. Keep this file durable and `PROGRESS.md` current.

## Fast reading order

1. `AGENTS.md` — operating and safety rules.
2. `PROGRESS.md` — current branch, release state, blockers and next action.
3. Read only the durable authority relevant to the change:
   - `PRODUCT.md` for product behaviour/scope.
   - `VISION.md` for strategic/platform guardrails.
   - `DESIGN.md` for UI/interaction work.
4. Read an active plan only when `PROGRESS.md` names one or the change is genuinely architectural/high-risk.

Do **not** preload dated specs, evidence folders, closed PRs or historical release narratives. Use them only to resolve a specific question or conflict. This keeps agent context/token use low without weakening durable product truth.

## Fast commands

```bash
npm run db:migrate:local
npm run typecheck
npm test
npm run build
npx wrangler types
node .agents/skills/impeccable/scripts/detect.mjs --json src/client
```

## Non-negotiable product boundaries

- Misfits 501 is one private club. It can retain many seasons; it is not a multi-club platform.
- The experience is dull Misfits luxury: dark, restrained, specific, mobile-first and deliberate on desktop. Never make it generic league SaaS.
- DartCounter is the scoring surface. Misfits records club results; it does not become a live scorer.
- Google Identity Services is the only sign-in method. Browser state is never authorization; the Worker verifies identity and protected operations.
- Keep supplied brand artwork intact and accessible.

## Cloudflare/free-tier boundary

- Core path: one Cloudflare Worker, static assets and one D1 database.
- Do not add paid Cloudflare services, queues, R2, Durable Objects, scheduled jobs, background polling or another runtime service without an explicit product decision.
- Keep secrets in Cloudflare/Wrangler configuration or `.dev.vars`; never commit or log them.
- Add only additive D1 migrations. Never edit an applied migration.
- Production D1 mutations run only through `.github/workflows/manual-d1-migration.yml`; never use an authenticated developer machine as a production migration path.
- Apply and verify a required production migration before merging code that depends on it.
- Normal PR CI should prove the full migration chain against local D1. Merge-to-main deploys code only and then proves production health.

## Risk-proportionate delivery

Use the lightest process that safely fits the change.

### Routine bounded changes

Examples: copy/CSS corrections, focused bug fixes, tests, documentation, dependency cleanup and low-risk refactors with no trust-boundary/interface change.

- Read affected code plus only the relevant authority above.
- State the change briefly; no separate spec/plan is required.
- Use focused tests where behaviour can regress.
- Batch coherent edits and run one fresh full repository gate before merge.
- Do not repeatedly seek approval for work already inside the user's approved scope.

### Architectural/high-risk changes

Examples: new subsystems, schema/data-model changes, auth/authorization changes, destructive operations, Cloudflare architecture changes or broad coupled releases.

- Use Superpowers to design, plan, test, debug and verify.
- An approved design/release plan authorizes implementation inside that scope unless assumptions materially change.
- Expand verification in proportion to risk.

### UI authority

- `DESIGN.md` is standing UI authority.
- Use repo-local Impeccable for material interaction/visual changes or when explicitly requested.
- Do not run a full visual audit for copy, tiny CSS or test-only work.

### Simplicity review

- Cave Pony is the simplicity gate for meaningful refactors, architecture/infrastructure proposals, broad cleanup or when explicitly requested.
- Prefer the smallest correct change; do not add abstraction or process that costs more to understand than it saves.
- Never simplify by weakening accessibility, security, authorization, data integrity or durable product truth.

### Handoff

- `PROGRESS.md` is a snapshot, not a diary. Keep one concise current-state block and one next action.
- Update it for a meaningful release start/completion, durable blocker or scope change.
- Put historical narratives/evidence in dated docs, not by appending them to `PROGRESS.md`.

## Boundaries

- **Always:** preserve semantics, accessibility, authorization and data integrity; test behaviour that can regress; record genuine evidence.
- **Ask first:** schema/data-model changes; new Cloudflare services/architecture; remote D1 migration; secret creation/rotation; destructive production-data operations; material product-truth rewrite; production deployment not already approved as part of a release.
- **No extra approval once in approved scope:** routine CI/test maintenance, ordinary dependencies, non-destructive refactors, bounded UI changes and the deploy step of an explicitly approved release after its gate is green.
- **Never:** commit secrets; edit applied migrations; bypass the production D1 workflow; automatically apply remote D1 migrations from push/PR/merge/schedule; weaken authorization; discard user work; claim a check passed when it did not run.

## Testing and verification

Tests own durable behaviour, not repository history:

- `tests/domain/` — competition/validation invariants.
- `tests/server/` — auth, persistence and API behaviour.
- `tests/client/` — journeys/presentation behaviour.
- `tests/release/` — deployment/schema/operational guardrails.

During implementation, run the smallest focused proof. Do not repeatedly run the full pipeline after tiny edits. Before merge, run one fresh gate: local D1 migrations, Wrangler types, both TypeScript projects, full Vitest suite and production build. Expand proof only for material security, permission, migration or data-loss risk.

Report actual output only. If evidence is blocked, record the blocker instead of claiming success.
