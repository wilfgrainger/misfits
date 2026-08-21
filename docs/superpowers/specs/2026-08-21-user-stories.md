# Misfits 501 — User Stories & Acceptance Criteria

**Date:** 21 August 2026
**Status:** Approved & Verified
**Product PO:** Jules (Proxy PO)

---

## 1. Player User Stories

### Story P-1: Signed-out Season Record View
> **As a** club visitor or player on mobile or desktop,
> **I want to** view current season standings and confirmed match results without signing in,
> **So that** I can easily inspect the club table at the board or on the go.

**Acceptance Criteria:**
- Standings table presents rank, player name, matches played, win-loss, average, and points.
- Score averages and points use tabular numbers; first place is highlighted with gold rank.
- Google Sign-In button is prominently centered on the public entrance card on mobile and desktop.

### Story P-2: Google Authentication & Nickname Onboarding
> **As a** new or returning player,
> **I want to** sign in securely using Google Identity Services and choose my club nickname,
> **So that** my real identity is authenticated and my nickname appears consistently on match records.

**Acceptance Criteria:**
- Sign-in is restricted to Google Identity Services.
- First-time players complete nickname onboarding before entering the workspace.
- Pending invites saved in browser session storage automatically join the player to the season upon sign-in.

### Story P-3: Result Entry & Confirmation
> **As a** active player in an open season,
> **I want to** record game results (legs and averages) or confirm pending results submitted by my opponent,
> **So that** match results are accurately settled on the official table.

**Acceptance Criteria:**
- Player selects opponent, legs won/lost, and player/opponent averages.
- Target leg guidance displays "First to X legs wins".
- Submitted results enter a `PENDING` state until confirmed by the opponent or an administrator.
- Disputed results open a focus-trapped dialog to capture a dispute note for admin review.

---

## 2. Administrator User Stories

### Story A-1: Multi-Season Management
> **As a** club administrator,
> **I want to** manage multiple seasons simultaneously (open/close seasons, adjust rules, switch visibility),
> **So that** historical and active club seasons remain organized over time.

**Acceptance Criteria:**
- Admin can switch between seasons via the season picker without resetting admin workspace state.
- Creating a new season sets identity, max players, matches per pair, target legs, points per win, and visibility (default PRIVATE).
- Admins can toggle visibility between PUBLIC and PRIVATE and open/close season registrations.

### Story A-2: Invites & Roster Management
> **As a** club administrator,
> **I want to** generate invite links, revoke expired/unused links, and activate or deactivate members,
> **So that** club access remains controlled and secure.

**Acceptance Criteria:**
- Creating an invite generates a unique URL and provides instant "Copied! ✓" visual feedback.
- Revoking an invite opens an accessible modal confirmation before revoking access.
- Active members count displays against max capacity (e.g. `1/16`).
- Admin list controls ("Revoke invite", "Deactivate", "Make admin") wrap cleanly on narrow mobile viewports without horizontal clipping.

### Story A-3: Admin Result Queue & Corrections
> **As a** club administrator,
> **I want to** review pending/disputed results, record historical scores, or edit/delete erroneous results,
> **So that** the table truth is always accurate and properly settled.

**Acceptance Criteria:**
- Admin can directly enter confirmed historical match results for any active players.
- Admin can confirm pending games or resolve disputes.
- Deleting a result presents a modal confirmation and removes the score from table calculation upon confirm.
