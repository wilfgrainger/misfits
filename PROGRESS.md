# Misfits 501 Progress

**Updated:** 22 August 2026  
**Current branch:** `spec/ux-compression`  
**Draft PR:** #168  
**Current focus:** Release 1 UX Compression, Task 3 direct admin Results composition verification  
**Production baseline:** `main` at `5d8e351ad4995305eb8970427846f2b821366a98`; PR #17 scoring release remains deployed

## Authority

- Product: `PRODUCT.md`
- Vision/platform guardrail: `VISION.md`
- UI: `DESIGN.md` + repo-local Impeccable skill
- Approved Release 1 design: `docs/superpowers/specs/2026-08-22-ux-compression-design.md`
- Release 1 implementation plan: `docs/superpowers/plans/2026-08-22-ux-compression.md`
- Canonical story wording/acceptance: `docs/superpowers/specs/2026-08-21-user-stories.md`
- Current 150-story evidence: `docs/superpowers/evidence/2026-08-22-full-user-story-validation.md`
- GitHub issues: operational story open/closed state

## Parked stories

All 150 canonical stories have issues. **117 are verified/closed; 33 remain incomplete/open (12 PARTIAL + 21 MISSING).** Release 1 does not close the 33.

Open distribution: Admin 6, Player 26, Public 1.

Open Admin: `ADM-075`, `ADM-081`, `ADM-083`, `ADM-084`, `ADM-087`, `ADM-088`.

Open Player: `PLY-009`, `PLY-012`, `PLY-014`, `PLY-016`, `PLY-022`, `PLY-023`, `PLY-024`, `PLY-026`, `PLY-027`, `PLY-028`, `PLY-029`, `PLY-030`, `PLY-031`, `PLY-032`, `PLY-033`, `PLY-034`, `PLY-035`, `PLY-036`, `PLY-037`, `PLY-038`, `PLY-039`, `PLY-040`, `PLY-050`, `PLY-052`, `PLY-053`, `PLY-055`.

Open Public: `PUB-005`.

## Release 1 execution

Superpowers: design **APPROVED**, plan **WRITTEN**, inline `executing-plans`, RED → GREEN TDD. Impeccable is UI handoff authority; Cave Pony is final simplicity/user audit.

### Task 1 — Player chrome, navigation and safe result defaults — GREEN

Delivered:
- member workspace uses horizontally scrollable `content-tabs` and 44px minimum touch targets;
- existing six destinations remain reachable because fixture-first stories are parked;
- result leg scores start/reset blank; recoverable failures preserve entered values;
- redundant signed-in account heading/role/mislabelled season-count badge removed;
- meaningful selected competition context retained.

Evidence:
- RED `32582699248`: 238 existing pass, exactly 2 intended new failures.
- RED shell `32582988576`: 240 pass, exactly 1 intended new failure.
- GREEN `32583252880`: Wrangler types, client+Worker TypeScript, **241/241 tests**, production build PASS; deploy skipped.

### Task 2 — Public experience — GREEN

Delivered:
- failed public league-list load now shows `The club table could not be loaded.` plus Retry;
- genuine zero-public-league state says `No public leagues are published yet.` and is distinct from failure;
- Retry reloads the league list in place;
- selected-league detail error behavior remains visible;
- league-specific sharing copy is `Share league`.

Evidence:
- RED `32583354161`: 241 existing pass, exactly 3 intended public UX failures.
- first GREEN candidate `32583452406`: product behavior passed; only two stale `Share season` assertions and one unsupported matcher remained.
- clean GREEN `32583582127`: Wrangler types, both TypeScript projects, **244/244 tests**, production build PASS; deploy skipped.

### Task 3 — Canonical admin Results composition — GREEN CANDIDATE

RED:
- `tests/client/admin-results-layout.test.tsx` mocks `createPortal` to throw if the legacy bridge is invoked.
- CI `32583693311`: Wrangler/typecheck PASS; **243 tests PASS, exactly 1 intended test FAILS** with `legacy Results portal invoked` from `AdminCompetitionDesk.tsx`.

GREEN candidate at `f828bd6c7ab6626e2699e61db0807e172029d0b7`:
- `AdminCompetitionDeskV2.tsx` imports and renders `AdminResultsWorkflow` directly inside the existing Results tabpanel;
- the old inline placeholder Result queue is replaced;
- `AdminCompetitionDesk.tsx` is reduced to a re-export of the canonical desk;
- all portal, DOM query, click-capture and manual child-hiding machinery is removed;
- no API/server behavior changed.

**Current gate:** bot-authored head CI `32583911689` was `action_required` with no jobs. This ordinary repository commit intentionally retriggers standard PR CI. Do not call Task 3 GREEN until that run passes.

### Tasks 4–7

4. Actual fixture player names in admin result entry; native progressive disclosure for infrequent Season/League create/copy/add actions.  
5. Prove/remove dead `AdminLeagueDesk`, `react-router-dom`, `zod` where safe.  
6. Align VISION/story authority and update handoff.  
7. Impeccable review, Cave Pony final audit, full repository verification, PR finish/merge.

## Next five releases

1. **UX Compression** (current).
2. **Fixture-First Player Experience**: permission-safe fixture reads, My/League Fixtures, progress/status, fixture-first entry, fixed-A/B score mapping, own pending result.
3. **Standings, Movement & Season Context**: zones/ambiguity/provisional-v-final movement, explicit current season, public league browsing, full rule context.
4. **Admin Competition Readiness & Safety**: whole-season readiness, `seasonHealth()`, operational counts, accessible destructive actions.
5. **History, Responsive Acceptance & Final Story Closure**: historic fixture context, viewport/touch acceptance, revalidate all 150 issues and close only fully evidenced stories.

## Parked Release 2 root cause

Normal players cannot currently read fixtures because `PlayerLeague -> ApiClient.fixtures()` calls `/api/admin/competition/leagues/:id/fixtures`, which requires ADMIN, and the client swallows the 403 into an empty fixture list. **Do not weaken the admin guard in Release 1.** Release 2 adds a permission-safe read contract.

Before that future flow becomes reachable, `Your/Their` score inputs must also map correctly onto fixed fixture Player A/B ordering to avoid the latent Player-B reversal.

## Guardrails / next-agent instruction

- No D1/schema/API architecture changes in Release 1.
- No new router, state framework, component library, backend service or Cloudflare product.
- Preserve Worker authorization, same-origin security, competition invariants and accessibility.
- Continue from Task 3 verification, then Task 4.
- Keep all 33 incomplete story issues open throughout Release 1.
- Run repo-local Impeccable before handoff, then Cave Pony final audit.
- Merge only a freshly verified final PR head.
