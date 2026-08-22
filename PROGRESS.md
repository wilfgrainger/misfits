# Misfits 501 Progress

**Updated:** 22 August 2026  
**Current branch:** `feat/private-club-entry`  
**Current focus:** Private club entry, admin approval and simplified app shell — design spec written; user review next  
**Main baseline:** Mobile Experience Reset PR #171 merged as `139231e6ea2df8ec1dba84a2e68991b874d0b31a`

## Authority

- Product: `PRODUCT.md`
- Vision/platform guardrail: `VISION.md`
- Standing UI authority: `DESIGN.md`
- Private-club entry design: `docs/superpowers/specs/2026-08-22-private-club-entry-design.md`
- Mobile Experience Reset design: `docs/superpowers/specs/2026-08-22-mobile-experience-reset-design.md`
- Mobile experience acceptance stories: `docs/superpowers/specs/2026-08-22-mobile-experience-stories.md`
- Functional story wording/acceptance: `docs/superpowers/specs/2026-08-21-user-stories.md`
- Latest functional story evidence: `docs/superpowers/evidence/2026-08-22-full-user-story-validation.md`
- GitHub issues own operational functional story open/closed state.
- `AGENTS.md` owns the durable delivery/test/verification policy.

## Functional backlog remains parked

**117/150 functional stories are verified/closed. 33 remain deliberately parked and open: 12 PARTIAL + 21 MISSING.**

The private-club release does not close parked stories merely by changing access/UI.

## Private Club Entry — DESIGN CHECKPOINT

User-approved product decisions:

- Misfits is private: anonymous users see no league, season, player, standings or result data.
- A brand-new person must arrive through a valid club invite before Google sign-in may create a membership request.
- Normal homepage Google sign-in is only for existing known users.
- New invited users become `PENDING`; they do not become club members or league players automatically.
- A club admin must `APPROVE` or `REJECT` each pending request in Club access.
- Club approval is permanent Misfits membership.
- Season/league assignment remains a separate admin decision in `league_players`.
- Approved but unassigned members may browse private club leagues/standings/results but cannot participate as competitors.
- Pending users see only the Misfits logo, `Membership request sent`, `Waiting for a club admin to approve you`, and Sign out.
- Returning approved users see a brief Misfits splash before the app appears.
- Primary app navigation becomes `League · Record · Results · More`; Admin moves under More for admins.
- Normal interaction accent changes from emerald to the red in the Misfits logo; green becomes semantic success/status only.

### Architecture

Use the existing domains rather than introducing a redundant club-members subsystem:

`Google identity → users.club_status → league_players`

- `users.status` remains ACTIVE/SUSPENDED account safety.
- new `users.club_status`: PENDING / APPROVED / REJECTED.
- new hashed `club_invites` table owns club-admission tokens.
- existing `league_players` continues to own season/league participation only.
- existing player-side league-invite self-assignment is retired from the product flow.
- Worker `requireClubMember` becomes the server-side privacy boundary for club data.
- approved membership owns club-wide read access; league placement owns participation.

### Migration

Implementation requires one additive migration after `0005_configurable_match_scoring.sql` for `club_status`, `club_invites`, deterministic existing-user backfill and league visibility hardening to PRIVATE.

Per `AGENTS.md`, CI must not remotely migrate D1. Remote migration remains an explicit guarded production action before code that depends on it is deployed.

### Design spec

`docs/superpowers/specs/2026-08-22-private-club-entry-design.md`

Self-review tightened two important points:

1. all non-admin/non-current-member historical users deterministically remain PENDING; there is no heuristic approval;
2. approved-but-unassigned members can read all club competition data regardless legacy league visibility/membership, while league participation remains separately authorized.

## Next step

User reviews/approves the written private-club design spec. After approval, use Superpowers `writing-plans` to create the implementation plan. Implementation must include security-first RED/GREEN tests, additive migration handling, Impeccable review of the entry/navigation/brand changes, and one fresh full repository gate before merge.

## Guardrails

- Cloudflare free tier only: existing Worker + static assets + D1.
- No KV, R2, Durable Objects, Queues, scheduled jobs or additional runtime.
- Do not edit applied migrations.
- Do not automate remote D1 migration.
- Preserve same-origin protection, admin/master-admin protection, auditability and competition invariants.
- No private club data may be exposed before `APPROVED` club membership is verified by the Worker.
- Keep all 33 parked functional stories open until separately revalidated.
