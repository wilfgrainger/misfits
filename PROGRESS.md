# Misfits 501 Progress

**Updated:** 22 August 2026  
**Current branch:** `feat/mobile-experience-reset`  
**Current focus:** Mobile Experience Reset — design authority complete; implementation planning next  
**Main baseline:** pragmatic delivery policy merged in PR #170

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

The `MX-001`–`MX-012` Mobile Experience stories are an experience acceptance layer. They do **not** change the 150-story functional denominator or close any parked story by themselves.

## Mobile Experience Reset — STEP 1 COMPLETE

The user approved a premium mobile-app direction based on the generated Misfits 501 mockup and supplied quality references.

Step 1 has converted that visual into durable repo authority:

- `docs/superpowers/specs/2026-08-22-mobile-experience-reset-design.md` treats the approved mockup as the visual target for hierarchy, composition, card rhythm, navigation, colour balance and quality;
- `DESIGN.md` now makes the standing system green-led, app-like, league-first and card-led rather than red-led / stacked-web-page-led;
- `docs/superpowers/specs/2026-08-22-mobile-experience-stories.md` defines `MX-001`–`MX-012` with explicit acceptance and mappings to the functional backlog;
- the old broken mobile composition is explicitly rejected: no horizontal overflow, oversized sign-in hero, repeated league/season headings, dead vertical gaps or squeezed seven-column phone table.

### Approved mobile hierarchy

`Club header → League hero → Rules strip → Standings → contextual member/sign-in action → Latest results → bottom navigation`

### Hard responsive acceptance

320 / 375 / 390 / 412 / 768 / 960+ widths, zero page-level horizontal overflow, 16–20px mobile gutters, 44px targets, readable contrast and no bottom-navigation overlap.

### Scope boundary

This reset uses current APIs/data. It does not weaken the admin fixture guard, add schema, change scoring, or silently implement the parked Fixture-First Player Experience backend.

## Next step

Write the Superpowers implementation plan for the UI rebuild, then implement the material responsive reset with Impeccable as UI authority. Use focused tests during implementation and one full repository gate before merge.

## Test ownership policy

- `tests/domain/`: pure competition/validation invariants.
- `tests/server/`: auth, permissions, persistence and API behaviour.
- `tests/client/`: user journeys and presentation behaviour.
- `tests/release/`: deployment/schema/operational guardrails not already owned elsewhere.

During implementation, use focused proof and batch coherent changes. Run one fresh full repository gate before review/merge. Expand proof only for material risk.

## Product releases after Mobile Experience Reset

1. **Fixture-First Player Experience**: permission-safe fixture reads, My/League Fixtures, progress/status, fixture-first entry, fixed-A/B score mapping, own pending result.
2. **Standings, Movement & Season Context**: zones/ambiguity/provisional-v-final movement, explicit current season, public league browsing, full rule context.
3. **Admin Competition Readiness & Safety**: whole-season readiness, `seasonHealth()`, operational counts, accessible destructive actions.
4. **History, Responsive Acceptance & Final Story Closure**: historic fixture context, revalidate all 150 functional issues and close only fully evidenced stories.

## Guardrails

- Keep all 33 incomplete functional story issues open until separately revalidated.
- Preserve Worker authorization, same-origin security, competition invariants, auditability and accessibility.
- No new router, state framework, component library, backend service or Cloudflare product without a real requirement.
- Use the risk-proportionate policy in `AGENTS.md`; do not recreate micro-CI loops.
