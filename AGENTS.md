# Misfits 501 — Agent Entry Point

Read this before changing code, configuration, migrations, documentation or release workflow. It is a durable operating manual, not a dated delivery brief.

## Authority and reading order

1. `PRODUCT.md` — the core product authority: users, purpose, scope and evidence.
2. `VISION.md` — the enduring strategic, voice and platform guardrail.
3. `DESIGN.md` — the implemented visual system and responsive rules derived from the product and vision.
4. `PROGRESS.md` — mutable branch truth: active work, verification, blockers and next handoff.
5. The active approved plan named by `PROGRESS.md`, then the affected code, tests and operations runbook.

Do not pin this entry point to a dated spec filename. `PROGRESS.md` identifies the live delivery record; files in `docs/superpowers/specs/`, `plans/` and `evidence/` retain the decision trail. Historical records are context only and must never restore white-label tenancy, player-owned administration or generic League Board language.

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
- CI deliberately does not apply remote D1 migrations. Apply and verify a remote additive migration manually before merging code that depends on it.
- Before production release, use `docs/operations/cloudflare-free-tier-runbook.md` and compare dashboard measurements with current official Cloudflare limits.

## Delivery authority

- Impeccable is the UI authority. Use the repo-local skill at `.agents/skills/impeccable/` for every UI change. For a new surface or replacement visual world: `$impeccable init`, then `$impeccable shape`; before handoff: `$impeccable critique`, `$impeccable audit` and `$impeccable polish`.
- Superpowers governs delivery: use its skills to clarify, plan, test, debug, verify and finish work. Superpowers hands every UI task to Impeccable before implementation.
- Cave Pony is the simplicity gate. It reviews the proposed and completed change for avoidable files, dependencies, abstractions and infrastructure; it does not trade away accessibility, security or durable product truth.
- Always read the durable documents above before choosing work. Update `PROGRESS.md` whenever handoff truth changes.
- The Impeccable detector hook is defined in `.codex/hooks.json`. Keep it enabled and approve the project hook in Codex when the client asks. Do not bypass a finding silently; record it as actioned, deferred with a trigger, or rejected with evidence.
- Use Cave Pony as the critical PR review. Record every material finding as **actioned**, **deferred with a trigger**, or **rejected with evidence**. Do not implement review feedback blindly.
- Prefer the smallest approved change. Do not add speculative schema, APIs, dependencies, services or abstractions.
- Preserve Worker-side authentication, authorization, same-origin mutation checks, audit records, privacy, accessibility and API compatibility.

## Boundaries

- **Always:** work from the active plan; test the changed path; preserve semantics and accessibility; record genuine evidence.
- **Ask first:** schema changes, dependencies, Cloudflare architecture changes, CI/CD changes, production deployment, remote D1 migration, secrets, destructive data operations or a material rewrite of product truth.
- **Never:** commit secrets; edit applied migrations; automate remote D1 migrations; add paid Cloudflare services or extra runtimes; weaken authorization; discard existing user work; claim a command passed when it did not run.

## Verification and handoff

Run the smallest focused test first. For UI work, include fresh Impeccable critique/audit evidence for both mobile and desktop. Before handoff, run the applicable focused checks, then the repository verification commands: typecheck, test, build, Wrangler types, Wrangler dry-run deployment, `git diff --check`, and `git status --short`.

Report actual output only. If a command is blocked by the environment, record the blocker and do not claim it passed.
