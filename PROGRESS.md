# Misfits 501 Progress

**Updated:** 22 August 2026  
**Current branch:** `main`  
**Current focus:** Mobile Experience Reset complete; rendered production screenshot review next  
**Main:** PR #171 merged as `139231e6ea2df8ec1dba84a2e68991b874d0b31a` plus this documentation-only checkpoint

## Authority

- Product: `PRODUCT.md`
- Vision/platform guardrail: `VISION.md`
- Standing UI authority: `DESIGN.md`
- Mobile Experience Reset design: `docs/superpowers/specs/2026-08-22-mobile-experience-reset-design.md`
- Mobile experience acceptance stories: `docs/superpowers/specs/2026-08-22-mobile-experience-stories.md`
- Functional story wording/acceptance: `docs/superpowers/specs/2026-08-21-user-stories.md`
- Latest functional story evidence: `docs/superpowers/evidence/2026-08-22-full-user-story-validation.md`
- GitHub issues own operational functional story open/closed state.
- `AGENTS.md` owns the durable delivery/test/verification policy.

## Functional backlog remains parked

**117/150 functional stories are verified/closed. 33 remain deliberately parked and open: 12 PARTIAL + 21 MISSING.**

Open distribution: Admin 6, Player 26, Public 1.

`MX-001`–`MX-012` are an experience acceptance layer and do not change the 150-story functional denominator.

## Mobile Experience Reset — COMPLETE

PR #171 merged to `main` as `139231e6ea2df8ec1dba84a2e68991b874d0b31a`.

### Delivered

- approved mockup is encoded as durable design authority rather than informal inspiration;
- public experience is league-first: club header → league hero → rules → standings → compact sign-in → latest results → app navigation;
- repeated season/league headings and the old oversized sign-in-first composition are removed;
- mobile standings prioritise POS / PLAYER / P / W-D-L / PTS while LEGS / AVG progressively return at wider widths;
- supplied Misfits artwork is retained and the normal active accent is emerald/club green;
- public and signed-in player experiences now share the same app-like product language;
- member navigation is capability-aware: Fixtures is not advertised when the current fixture read is inaccessible; Record remains available through the existing result path;
- Latest results has explicit data, genuine-empty and retryable-failure states;
- SVG icon family, 44px controls, mobile safe-area navigation and clean reduced-motion behavior are included;
- no new framework, dependency, Cloudflare service, schema, migration, auth authority or API authority was introduced.

### Verification

RED CI `32596330889` proved the old composition failed exactly the new experience contract: **229 existing tests passed and 2 intended tests failed**.

Final PR-head CI `32597169815` on `bc6a9b728bb710c71ac3ac025926a7e57941398f` passed:
- `npm ci`;
- Wrangler types;
- both TypeScript projects;
- full Vitest suite;
- production build.

Deploy correctly skipped on the pull request.

### Review

Impeccable source review covered hierarchy, responsive composition, contrast, touch targets, semantics, icon consistency, safe areas and reduced motion. Material findings were actioned in the implementation batch.

Cave Pony simplicity review found no justification for new framework/service/state abstractions. The existing React + Worker + D1 boundaries remain intact.

### Rendered acceptance limitation

This tool session does not expose browser/device rendering for the deployed app. The generated mockup is the design target, but an actual production screenshot at phone width has **not** been falsely claimed as verified. The next useful acceptance action is to open `darts.graingers.agency` on a phone after deployment and compare the rendered result with the approved mockup, especially at 320–412px.

The connected GitHub workflow helper in this session does not expose push-triggered `main` workflow runs, so do not claim a specific production deploy run ID unless it is independently observed later. Do not add observer infrastructure merely to obtain one.

## Next product release

**Fixture-First Player Experience** remains next after rendered UI acceptance:

- permission-safe player fixture reads without weakening `/api/admin/*`;
- My Fixtures and League Fixtures;
- fixture progress/status;
- fixture-first result entry;
- correct fixed Player A/B score mapping;
- own pending result visibility.

Then:
1. Standings, Movement & Season Context;
2. Admin Competition Readiness & Safety;
3. History, Responsive Acceptance & final functional-story revalidation.

## Guardrails

- Keep all 33 incomplete functional story issues open until separately revalidated.
- Preserve Worker authorization, same-origin security, competition invariants, auditability and accessibility.
- No new router, state framework, component library, backend service or Cloudflare product without a real requirement.
- Use focused proof during development and one fresh full repository gate before merge; do not recreate micro-CI loops.
