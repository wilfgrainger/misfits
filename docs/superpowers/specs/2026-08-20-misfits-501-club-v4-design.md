# Misfits 501 Club v4 — Product Design and Current-State Review

> **Status:** Current product authority. This deliberately supersedes the white-label v3 direction and returns the application to one Misfits-only darts club.

**Date:** 20 August 2026  
**Platform:** Cloudflare Worker + D1 + React/Vite  
**Principle:** Prove one brilliant club end to end before considering anything broader.

## 1. Decision

The product is **Misfits 501**, not a platform for arbitrary league owners. The attached circular artwork, near-black ground, aged cream type and dart red are the identity. The voice is confident and irreverent: “We don't follow the game” and “We just can't hit 180.” Accessibility and legibility take priority over novelty.

A club contains many weekly league seasons over time. Closed leagues remain visible as history. There is no user-created club, tenant selector, white-label shell or paid core dependency.

## 2. Current-state review

### Proven in the repository

- Google-only sign-in with verified server-side identity and opaque sessions.
- Nickname onboarding and Google profile image capture.
- Hashed, revocable invite links and capacity-safe membership joins.
- Current/public league directory, stable share URLs, league configuration and closed league states.
- Player result entry restricted to the signed-in player, two-player confirmation/dispute, administrative correction and deletion.
- Confirmed-result standings, wins/losses, legs, points and three-dart averages.
- Administrator People controls, account suspension and administrator promotion by the master administrator.
- Cloudflare Worker, D1 migrations, static assets, security headers and automated domain/server/client coverage.

### Incorrect for the new direction

- The v3 shell and metadata are generic “League Board”.
- Any authenticated user can create and own a league.
- The UI frames every player as a possible league owner.
- Administration is based on per-league ownership; promoted club administrators do not automatically share club operations.
- Public profiles contain no bio and table names are not yet clickable player cards.

### Missing product capability

- Shared club join landing and a distinct **request to join league** workflow with pending/approved/rejected states.
- A deliberate archive view for previous seasons.
- Weekly fixture generation, schedule, availability/postponement handling and reminders.
- Rich league statistics: streaks, form, highest/lowest averages, head-to-head and player history.
- Player bio, privacy choices and player detail surface.
- Admin-configured WhatsApp and social links.
- DartCounter workflow guidance (camera scoring, optional Omni, then result import/entry) without attempting to become a scorer.
- Operational usage dashboard/alerts for Cloudflare free-tier headroom.

## 3. Roles and access

- **Visitor:** can see club identity and deliberately public current/archive tables; cannot see email or private member data.
- **Signed-in person:** has exactly one Google-backed account and can edit only their own profile. A shared invite associates them with the club.
- **Member:** can request a place in an open league, view member resources and WhatsApp access, and participate after approval.
- **Administrator:** can approve requests, manage membership, leagues, fixtures and results, and enable or remove other non-master administrators.
- **Master administrator:** initial out-of-band recovery authority. The configured account cannot be demoted by another admin.

Every permission is checked in the Worker. The UI is not an authorization boundary.

## 4. Core journeys

### Join the club

1. A person opens the shared Misfits link.
2. The page explains the club and shows the official Google button.
3. After verified sign-in, first-time users choose a unique club nickname and may add a bio/DartCounter link.
4. The invite is redeemed idempotently and the member lands on the club home.

### Join a league

1. A member opens **Leagues**, seeing open, active and previous seasons.
2. They request an open league place; repeated requests are idempotent.
3. Admins approve or reject from a single queue. Approval is capacity-safe and audited.
4. The member receives an in-app state change; WhatsApp remains the human notification fallback in the first release.

### Play weekly

1. The fixture identifies the opponent, week and format.
2. Players arrange details in WhatsApp and play exclusively in DartCounter using camera scoring; Omni is optional.
3. One player enters the final legs and both three-dart averages (or a later supported import).
4. The opponent confirms or disputes. Confirmation updates table, form and player stats atomically.

### Review history

Visitors/members can switch from the current season to closed seasons. The archive preserves final tables, results and player snapshots even when a member later changes their current profile.

## 5. Experience direction

- Mobile-first; key weekly actions fit a phone without horizontal page scrolling.
- Black header/hero, warm cream content, dart red for emphasis, muted bronze/grey dividers.
- Use the supplied Misfits mark prominently but not as a low-contrast background behind text.
- Home hierarchy: identity → current league status → next action → table/results → club links.
- Table player names and avatars open an accessible player sheet/page with bio, season record, average, form and DartCounter link.
- Social links are admin-configured; absent links are not rendered publicly. WhatsApp access is member-only to avoid exposing a group invitation.
- All state changes have explicit loading, success, empty and error states.

## 6. League capability benchmark

The goal is the useful club core associated with mature league products, not indiscriminate feature parity:

- registrations/approvals, divisions/seasons and archive;
- schedules/fixtures and postponements;
- results with confirmation/correction and audit history;
- configurable scoring/tie-break ordering;
- standings, form, player leaders and head-to-head;
- announcements, contacts/social links and mobile sharing;
- exports/backups and an administrator operations view.

Tournaments, teams, payments, venue marketplace, live darts scoring and multi-club tenancy are excluded until the one-club weekly league is proven.

## 7. Data additions (next increment)

- `users.bio`, with a short plain-text limit.
- `club_memberships` if club membership needs to be distinct from league participation.
- `league_join_requests` with unique `(league_id,user_id)`, state, reviewer and timestamps.
- `fixtures` with week/date, two participants, state and optional result reference.
- `club_links` with typed, ordered, admin-managed URLs and member/public visibility.
- Snapshot fields or season-player records so archives do not silently change identity.

All schema changes are additive D1 migrations. Photos continue to use the verified Google image initially, avoiding R2 cost and image-moderation scope.

## 8. Free-at-club-scale constraint

Core operation uses only Cloudflare free-tier-capable primitives already present: Workers/static assets and D1. Do not introduce queues, paid analytics, transactional email, hosted image uploads or background polling as a requirement. Cache safe public reads, paginate history, index join/fixture/result queries, and make writes event-driven. Before each release, compare actual D1 rows/reads/writes, Worker requests and CPU time with Cloudflare's current limits; “free forever” is a product constraint to monitor, not a guarantee any vendor contract can make.

## 9. Acceptance bar

The concept is proven when one invited person can complete the journey from Google sign-in through approved weekly league membership, profile setup, fixture discovery, DartCounter play, result confirmation and updated standings; an administrator can operate the entire journey on mobile; a closed season remains readable; private data is absent from public APIs; and measured usage remains comfortably inside free allowances.

## 10. Open decisions for the club owner

These do not block the branded foundation, but must be answered before join requests/fixtures are declared complete:

1. Exact public URL, public visibility level and club location/time zone.
2. WhatsApp community/group invitation URL and which other socials are official.
3. Weekly match night/day, season length, default match format, postponement window and tie-break order.
4. Whether Google photo is sufficient or members need uploads; whether bios are public or members-only.
5. Whether DartCounter results remain manual/confirmed or an officially supported integration is available and desired.
