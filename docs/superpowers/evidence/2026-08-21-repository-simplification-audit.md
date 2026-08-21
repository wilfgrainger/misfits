# Repository Simplification and Release Audit

**Date:** 21 August 2026
**Scope:** full repository structure, client UI, Worker/D1 configuration, CI and release workflow
**Authority:** `PRODUCT.md` → `VISION.md` → `DESIGN.md` → `PROGRESS.md`

## Outcome

The repository can stay a single Cloudflare Worker with static assets and D1. No schema, API, authentication or infrastructure change is needed for this UI/code-structure release. The main structural defect was presentation drift: `src/client/styles.css` contained sequential visual override layers. It is now one canonical, token-led stylesheet.

## Audit method

- Read repository structure, root documentation, client components/tests, Worker routes, authentication guards, D1 configuration, CI and deployment configuration.
- Reviewed Cloudflare Worker configuration against the official [Workers best-practices guidance](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/).
- Ran focused client contracts and product/UI tests before and after the stylesheet consolidation.
- Used Impeccable as UI authority: existing product/design context, canonical-token extraction, craft-floor review and deterministic detector.
- Used Cave Pony as the delivery/simplicity review.

This is a source and configuration audit. A package vulnerability audit and live Wrangler checks were not available because the managed environment denied the required network approval before those tools returned a result.

## Findings and decisions

### P1 — layered stylesheet creates conflicting visual authority

**Evidence:** the prior `styles.css` had multiple stacked, competing visual layers and duplicated selectors.
**Consequence:** a small style edit could silently undo a later mobile or desktop rule; review could not identify the source of truth.
**Actioned:** replaced it with one token-led file using `--ink`, `--paper`, `--club-red`, semantic supporting tokens and one mobile-first/desktop breakpoint system. Existing component, network and state boundaries remain untouched.

### P1 — product authority was stale and versioned in contributor paths

**Evidence:** AGENTS/README named a dated design specification as binding product truth while durable `PRODUCT.md` existed.
**Consequence:** future agents could reinstate historical assumptions or treat a release record as current product authority.
**Actioned:** AGENTS and README now direct readers to `PRODUCT.md` first; the vision, design and mutable handoff follow in order.

### P2 — conflicting “no eyebrows” rule

**Evidence:** the design record prohibited every eyebrow, while the approved landing reference and live UI use small red identity/state lines.
**Consequence:** agents could either remove meaningful season/status context or knowingly violate the visual system.
**Actioned:** clarified the rule: decorative eyebrows are prohibited; only identity or useful state context may use a small red line.

### P2 — native destructive confirmations

**Evidence:** invite revocation and result deletion still use `window.confirm`.
**Decision:** **deferred with trigger.** Native confirms are keyboard-safe and avoid a second unfinished dialog system. Replace them with one accessible shared confirmation pattern only when destructive-operation UX is a separately scoped change.

### Infrastructure and security boundary

**Evidence:** `wrangler.jsonc` uses one Worker, static assets and one D1 binding. CI deploys only after verification on `main`; it keeps dashboard-managed variables and does not automate remote D1 migrations. Worker mutations use same-origin middleware; route guards enforce identity and administration server-side.

**Decision:** **rejected as unnecessary:** adding Queues, R2, Durable Objects, scheduled jobs, polling, `nodejs_compat`, a second runtime, or a schema change. None solves a present requirement and each violates the free-tier/simplicity boundary.

## Cave Pony review

- **Actioned:** canonical stylesheet instead of another CSS override layer.
- **Actioned:** durable authority documents instead of a new process framework.
- **Actioned:** preserved the stateful administrator desk as one local component rather than splitting it into prop-drilled files.
- **Rejected with evidence:** new infrastructure, dependencies and D1 changes; present Worker/auth/data boundaries already meet the release scope.
- **Deferred with trigger:** custom destructive confirmation; see P2 above.

## Release proof

Fresh command outcomes are recorded in `PROGRESS.md` after the final verification run. The remaining non-code gate is an authenticated mobile and desktop walkthrough on an authorized, browser-reachable origin.
