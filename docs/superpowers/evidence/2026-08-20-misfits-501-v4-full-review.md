# Misfits 501 v4 — Full Repository Review

**Date:** 20 August 2026  
**Status:** Current gap analysis and delivery authority  
**Method:** Parallel security/data, UI/accessibility, and quality/Cloudflare reviews followed by targeted verification.

## Executive assessment

The foundation is credible: Google identity is verified in the Worker, sessions are opaque and secure, results use opponent confirmation, standings derive only from confirmed results, and the runtime uses Cloudflare Workers, static assets, and D1. The product is not yet ready for club use. The earlier v4 change restored identity but left the former owner-created league authorization model and most of the approved single-club journey intact.

This increment fixes the highest-risk contradiction. Every league-management route now requires an active `ADMIN`, every administrator can operate every Misfits season, ordinary players receive `403`, and administrators—not only the master account—can enable other administrators. Master and last-active-administrator protections remain enforced.

## Completed security gate

- Worker authorization, not conditional rendering, is the administrative boundary.
- Player-created leagues and player-owned administration are rejected.
- Promoted administrators receive club-wide season management access.
- The configured master administrator cannot be demoted or suspended.
- The last active administrator cannot be removed or suspended.
- Cross-origin mutations remain rejected.

## Remaining release blockers

### 1. Approved club membership journey

The current league invite immediately creates `league_players` membership. Replace it with a hashed club invite that creates accepted club membership, followed by a separate idempotent league request with `PENDING`, `APPROVED`, `REJECTED`, and `WITHDRAWN` states. Approval must enforce capacity and write an audit record.

### 2. Reliable weekly fixtures

Add deterministic, idempotent round-robin generation, week and scheduled date, postponement state, and exactly one result per fixture. DartCounter remains the exclusive scoring experience; this application schedules, confirms, and records the outcome.

### 3. Immutable archives

Closing a season must reject result creation/edit/deletion, confirmation/dispute, membership changes, and ordinary configuration writes. Closing must preserve final standings and display-name/photo snapshots. Reopening must be an explicit audited administrator operation.

### 4. Public, member, and admin surfaces

Split the current conditional page into a public clubhouse, member hub, and lazy-loaded administrator control room. The member home should lead with the next fixture. Tables require semantic headers; dialogs require focus management and Escape handling; all controls need visible focus.

### 5. Club identity and profiles

Display the supplied artwork without destructive circular cropping. Add bio and privacy controls, keyboard-accessible player cards, public social settings, and a member-only WhatsApp link. Do not add paid fonts, an image CDN, or mandatory uploads.

### 6. Cloudflare free-tier operations

Keep one Worker, static assets, and D1. Paginate result/history reads, cap season size, add request/fixture indexes, prune expired sessions and invitations, cache safe public reads, and snapshot closed tables. Add a release runbook that compares requests, CPU, D1 reads/writes, rows, and storage against current Cloudflare limits without promising a vendor's limits will never change.

## Verification still required before launch

1. Clean and upgrade-path D1 migrations using the real local runtime.
2. Authorization matrix for every administrative endpoint.
3. Real Google journey using one administrator and two players.
4. Club invite, league request, approval, fixture, result, confirmation, standings, and archive journey.
5. Mobile administrator operation and desktop/mobile visual evidence.
6. Keyboard-only, focus, dialog, semantic-table, 200% zoom, reduced-motion, and contrast checks.
7. Wrangler dry-run deployment and a documented free-tier usage budget.

No feature is considered complete solely because its browser control is hidden. Each stage closes with Worker tests, client tests, build/type checks, deployment validation, and evidence.
