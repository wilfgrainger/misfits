# Misfits 501 Club v4 — Product Design and Current-State Review

> **Status:** Current product authority. This deliberately supersedes the white-label v3 direction and returns the application to one Misfits-only darts club.

**Date:** 20 August 2026  
**Platform:** Cloudflare Worker + D1 + React/Vite  
**Principle:** Establish one luxury, pristine Misfits 501 club foundation before considering anything broader.

## 1. Decision

The product is **Misfits 501**, not a platform for arbitrary league owners. The attached artwork, near-black ground, aged cream type and dart red are the identity. The experience is a luxury, pristine Misfits 501 club UI: confident and irreverent, but accessible and legible ahead of novelty.

A club can contain many weekly league seasons over time. Archive and history treatment, including whether or when closed leagues are visible, is gated until the club owner records that decision. There is no user-created club, tenant selector, white-label shell or paid core dependency.

## 2. Current-state review

### Current foundation slice

- A single Cloudflare Worker serves static assets and the application API; one D1 database stores club data.
- Google Identity Services is the only sign-in method. Identity verification, authorization, privacy, same-origin mutation checks, and audit records remain server-side requirements.
- DartCounter remains the scoring surface. The application records league data and does not become a live scorer.
- Current invite-based league membership and existing administrator league operations are foundation capabilities. They remain subject to the existing Worker-side authorization, privacy, mutation, and audit boundaries.
- The foundation does not add a runtime API, dependency, database table, scheduled job, queue, object store, or secret.

### Retired direction

- The v3 shell and metadata are generic “League Board”.
- Historical materials may describe white-label or player-created league ownership. Those are not current product direction.

### Gated follow-on work

- Membership-request capability.
- Fixtures and league scheduling.
- Archive presentation for previous seasons.
- Player bios and detail surfaces.
- Club social and WhatsApp connections.
- Statistics such as form, streaks, averages, head-to-head, and player history.
- Measured Cloudflare free-tier headroom and an operational response if it narrows.

## 3. Roles and access

- **Visitor:** sees only deliberately public club material and never private member data.
- **Signed-in person:** has one Google-backed account; Worker-side authorization determines what they may access or change.
- **Member and administrator:** current invite-based league membership and existing administrator league operations are foundation capabilities. Membership-request workflows, fixtures/scheduling, and other listed follow-ons remain gated; their permissions must be enforced in the Worker when introduced.
- **Master administrator:** remains out-of-band recovery authority; any later administrator-management work must preserve its protections.

Every permission is checked in the Worker. The UI is not an authorization boundary.

## 4. Core journeys

### Foundation journey

1. A person reaches Misfits 501 and uses the official Google sign-in.
2. The Worker verifies identity and enforces the server-side access contract.
3. The application records league data while DartCounter remains the scoring surface.

### Gated follow-on membership journey

Membership requests must not be represented as complete until the club owner records the relevant club decisions.

### Gated play journey

Fixtures and related league operation must wait for the club owner’s match-night, season, format, postponement, and tie-break decisions. DartCounter guidance or integration also requires an explicit club decision; do not invent any of these values.

### Gated history journey

Archive behavior, player bios, social links, and statistics are follow-on work. Their visibility and source data must be decided before implementation.

## 5. Experience direction

- Mobile-first; key weekly actions fit a phone without horizontal page scrolling.
- Black header/hero, warm cream content, dart red for emphasis, muted bronze/grey dividers.
- Use the supplied Misfits mark prominently but not as a low-contrast background behind text.
- Home hierarchy: identity → current league status → next action → table/results → club links.
- Player bio and detail presentation is gated follow-on work; the club owner must decide its scope first.
- Social links and WhatsApp access are gated follow-on work; the club owner must decide their scope first.
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

## 7. Gated implementation boundary

Membership requests, fixtures, archive presentation, player bios, social connections, and statistics are capability outcomes only. No database schema, migration, API shape, workflow state, visibility rule, or identity-storage approach is approved for them until the relevant open club decisions are recorded and the capability has separate proof.

When a follow-on capability is approved, apply Cave Pony: choose the smallest additive change that meets the recorded decision, preserves existing server-side security and API compatibility, and is covered by a focused test. Do not reserve columns, tables, or endpoints in advance.

## 8. Free-at-club-scale constraint

Core operation uses only Cloudflare free-tier-capable primitives already present: one Worker serving static assets and one D1 database. Do not require paid services, queues, object storage, scheduled work, or background polling. Writes remain user-driven. Before each release, compare actual D1 rows/reads/writes, Worker requests, and CPU time with Cloudflare's current limits. Capacity and query-shape safeguards are selected only with each approved follow-on design; “free forever” is a product constraint to monitor, not a guarantee any vendor contract can make.

## 9. Foundation acceptance bar

The foundation is proven when the luxury, pristine Misfits 501 club UI is clearly one-club; Google sign-in and Worker-side privacy/security boundaries remain intact; DartCounter stays the scoring surface; no paid Cloudflare dependency is required; and measured usage is reviewed against current published allowances. Membership requests, fixtures, archives, bios, socials, and statistics require their gated decisions and separate proof before they are called complete.

## 10. Open decisions for the club owner

These do not block the branded foundation, but must be answered before join requests/fixtures are declared complete:

1. Exact public URL, public visibility level and club location/time zone.
2. WhatsApp community/group invitation URL and which other socials are official.
3. Weekly match night/day, season length, default match format, postponement window and tie-break order.
4. Whether Google photo is sufficient or members need uploads; whether bios are public or members-only.
5. Whether DartCounter results remain manual/confirmed or an officially supported integration is available and desired.
