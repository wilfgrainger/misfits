# Misfits Repository Operating Model — Design

**Status:** Approved for implementation
**Date:** 21 August 2026
**Scope:** Repository authority, agent handoff, pull-request review discipline, and the two verified UI P1 fixes.

## Purpose

Misfits 501 is one private darts club. The repository must make that direction obvious to a human or agent without requiring them to reconstruct it from historical releases.

The product model is **one club, many seasons over time**. This design does not add a database rule limiting the club to one open season. A later product decision can do that if it becomes necessary.

## Authority and documents

| Document | Job | Must not contain |
| --- | --- | --- |
| `AGENTS.md` | Mandatory repository entry point and execution rules | Release history or changing task status |
| `VISION.md` | Durable product, experience and platform intent | Branch names, check results or dated handoff notes |
| `PROGRESS.md` | Current truth for the next agent: branch, deployment, verification, blockers and next action | New product requirements or long historical narrative |
| `README.md` | Human setup, local development and production operations | A second agent contract |
| `docs/superpowers/specs/` | Approved detailed designs | Historical evidence presented as current authority |
| `docs/superpowers/plans/` | Executable implementation plans | Product decisions not approved in a spec |
| `docs/superpowers/evidence/` | Immutable dated evidence | Current instructions |

`AGENTS.md` points to these documents in this order. The club-v4 design remains the binding detailed product specification. v1-v3 material remains retained evidence only and must be marked historical by the entry-point document.

## Required engineering workflow

Every development change follows this sequence:

1. Read `AGENTS.md`, `VISION.md`, `PROGRESS.md`, the relevant approved spec, and the affected code/tests.
2. Use the applicable Superpowers skills: brainstorming before new design, writing-plans before multi-step work, TDD before behavior changes, systematic debugging for defects, verification before completion, and review/finish skills at their stated gates.
3. Use Cave Pony for critical review on every pull request. Record each finding as **actioned**, **deferred with a trigger**, or **rejected with evidence**.
4. Preserve the Cloudflare free-tier boundary and Google-only authentication boundary.
5. Update `PROGRESS.md` when work changes the real handoff state.

The PR template records the review decision, required verification, mobile and desktop evidence, D1 migration state, and Cloudflare-service impact. It is a checklist, not a CI substitute.

## Platform boundary

- One Cloudflare Worker serves the React static assets and Hono API; one D1 database stores club data.
- No paid Cloudflare product, queues, R2/object storage, Durable Objects, scheduled jobs, background polling or extra runtime service is part of the core path.
- Google Identity Services is the only authentication method. The Worker verifies identity and authorizes every protected operation.
- D1 migrations are additive and remote migrations are applied and verified manually before dependent code is merged. CI must not apply remote migrations.
- Cloudflare limits are checked against current provider documentation and measured dashboard usage before release; no document promises permanent free capacity.

## UI P1: accessible result dispute

The dispute sheet is a modal dialog. While open it must:

- expose `role="dialog"`, `aria-modal="true"`, and an accessible name;
- place keyboard focus in the dispute note field;
- keep Tab and Shift+Tab inside the dialog;
- close on Escape or Cancel without submitting;
- return focus to the originating Dispute button; and
- retain existing server-side validation and result workflow.

Implement this locally in the player result component. Do not introduce a generic modal framework or a dependency for one current dialog.

## UI P1: club administration

The administrator surface is a club control room, not a generic dashboard and not one unstructured long form.

- Mobile is the baseline: one task group visible at a time without horizontal scrolling.
- Desktop keeps the club/season picker in a stable rail and presents the selected task group beside it.
- Task groups are: **Season**, **Members & invites**, **Results**, and **People**.
- “Create a league” becomes “Create a season”; it remains available only to administrators and uses the existing server route/API shape.
- Existing administration behavior, audit records and Worker authorization remain unchanged.
- Use local component composition only where it gives each task group a clear responsibility and a focused test. Do not redesign APIs or schema.

## Acceptance evidence

The increment is complete only when:

- root authority/handoff documents agree and clearly separate current truth from historical evidence;
- the PR template requires Superpowers/Cave Pony review decisions and platform checks;
- the dispute interaction has focused client tests for semantics, keyboard behavior and focus return;
- administrator tests prove a non-admin cannot receive the control room and admin task groups remain usable;
- CSS is mobile-first and has an explicit desktop layout for the administrator surface;
- existing full test, typecheck, build, generated Worker types, dry-run deployment and diff checks are run where the environment permits; and
- `PROGRESS.md` accurately identifies uncommitted work and any checks blocked by the environment.
