# Misfits 501 — Master Functional User Story Catalogue

**Status:** Canonical functional backlog  
**Date:** 21 August 2026  
**Repository:** `wilfgrainger/misfits`  
**Application:** `https://darts.graingers.agency`  

## 1. Authority and purpose

This file is the **master user-story list for Misfits 501**. It owns the functional backlog for administrator, player and deliberately public club behaviour.

Older dated design specs remain useful decision history, but their functional scope statements do not override later decisions recorded here. In particular:

- the v2 decision to exclude persisted fixtures and promotion/relegation is superseded;
- the v4 decision to gate fixtures is superseded;
- Misfits 501 remains one club, not a white-label or multi-club SaaS product;
- DartCounter remains the live scoring surface. Misfits records and settles club competition data rather than becoming a dart-by-dart scorer;
- Google Identity Services remains the sole sign-in method;
- the core runtime remains one Cloudflare Worker, static assets and one D1 database on the free-tier-capable path.

`PRODUCT.md` and `VISION.md` remain the enduring product/platform authorities. Where their older wording still gates fixtures or other capabilities explicitly approved here, they should be aligned as part of the first implementation plan rather than silently used to invalidate this backlog.

This catalogue exists so that each behaviour can be:

1. tested against the current production application;
2. classified as implemented, partial or missing;
3. backed by automated tests where practical;
4. implemented where missing and approved;
5. retained as regression coverage thereafter.

## 2. Product model now approved

The competition model is:

```text
Club
  -> Season
      -> League / Division
          -> League Membership
              -> Fixtures
                  -> Results
                      -> Standings
                          -> Promotion / Relegation
                              -> Next Season
```

The following decisions are now explicit:

- A **Season** is a competition period such as `2026/27`.
- A Season may contain **multiple Leagues / Divisions** such as Premier, Division One and Division Two.
- A player is mapped to a **specific Season and League**. Club membership alone does not define their competitive placement.
- League membership is historical. Moving a player next season must never rewrite which league they played in previously.
- Administrators create and manage seasons, leagues, league memberships, competition rules and promotion/relegation options.
- Administrators automatically generate the complete set of required fixtures from league membership and match-repeat rules.
- Generated fixtures are **persisted in the backend** with stable identities. They are not reconstructed independently by each browser.
- A normal league result settles an existing fixture. Results should no longer be modelled as arbitrary free-floating matches between any two members.
- Only confirmed results affect standings.
- Promotion/relegation produces a proposed next-season placement which an administrator reviews before committing.
- Fixture **pairing generation** is in scope. Calendar dates, match-night scheduling, postponement windows and venue scheduling remain separate decisions unless explicitly approved later.

## 3. Status and priority

| Status | Meaning |
|---|---|
| **CURRENT** | A recognisable implementation exists now and should be regression-tested. |
| **PARTIAL** | Some behaviour exists, but the full story is not yet satisfied or the data model must change. |
| **MISSING** | Required target behaviour is not currently evident. |
| **GATED** | Deliberately requires another club/product decision before implementation. |

| Priority | Meaning |
|---|---|
| **P0** | Competition integrity, security, data integrity or essential club operation. |
| **P1** | Core weekly club experience. |
| **P2** | Valuable enhancement once the core flow is sound. |
| **P3** | Later evolution, not required for the first complete competition lifecycle. |

---

# 4. Administrator user stories

## 4.1 Identity, access and governance

| ID | User story | Acceptance criteria | State |
|---|---|---|---|
| **ADM-001** | As an administrator, I want to sign in with Google so that club administration is restricted to verified identities. | Google identity is verified by the Worker; invalid/unverified credentials fail; admin authority is never trusted from browser state alone. | **DELIVERED · P0** |
| **ADM-002** | As an administrator, I want a secure persistent session so that I can administer the club without repeatedly authenticating during normal use. | Session is opaque, HttpOnly, Secure and appropriately scoped; logout invalidates local authenticated state; suspended users cannot keep mutating data. | **DELIVERED · P0** |
| **ADM-003** | As an administrator, I want to switch between Season Admin and normal player view so that I can use the club as both administrator and competitor. | Switching requires no new login; player view follows normal player rules; admin permissions remain server-side regardless of displayed view. | **DELIVERED · P1** |
| **ADM-004** | As an administrator, I want to see the club account directory so that I know who has access. | Directory shows appropriate account identity, role and status; it is admin-only; public APIs never expose private identity fields. | **DELIVERED · P0** |
| **ADM-005** | As an administrator, I want to promote a trusted player to administrator so that club management can be shared. | PLAYER can become ADMIN only through authorised server-side action; change takes effect without requiring client-side trust. | **DELIVERED · P0** |
| **ADM-006** | As an administrator, I want to demote another administrator so that elevated access can be withdrawn. | ADMIN can return to PLAYER; protected/master-admin invariants are enforced; ordinary admins cannot accidentally eliminate recovery authority. | **DELIVERED · P0** |
| **ADM-007** | As an administrator, I want to suspend a club account without deleting it so that a person can lose access while historical competition data remains intact. | Suspended user cannot perform protected actions; memberships/results remain; account can later be reactivated. | **DELIVERED · P0** |
| **ADM-008** | As an administrator, I want to reactivate a suspended account so that a returning member can regain permitted access. | Account returns to ACTIVE; historical records are reused rather than duplicated; league-specific eligibility still follows membership. | **DELIVERED · P1** |
| **ADM-009** | As the protected/master administrator, I want protection against accidental self-lockout or removal of the final usable administrator so that the club cannot become unmanageable. | System preserves at least one recovery path; prohibited changes fail server-side as well as in UI; destructive role changes are explicit. | **DELIVERED · P0** |

## 4.2 Season lifecycle

| ID | User story | Acceptance criteria | State |
|---|---|---|---|
| **ADM-010** | As an administrator, I want to create a season so that a new competition period can begin without overwriting previous history. | Season receives stable ID and display name; previous seasons remain unchanged; creation does not copy results or fixtures. | **DELIVERED · P0** |
| **ADM-011** | As an administrator, I want to edit season metadata so that naming or setup mistakes can be corrected. | Allowed metadata persists; changes do not detach existing leagues or historical records; invalid values fail clearly. | **DELIVERED · P1** |
| **ADM-012** | As an administrator, I want a season state such as draft/open/closed so that setup, live competition and completed history are distinguishable. | State is persisted and backend-enforced; transitions are explicit; normal player mutations follow the state. | **DELIVERED · P0** |
| **ADM-013** | As an administrator, I want to open a prepared season so that competition can begin only after its leagues and memberships are ready. | Opening validates required setup; status becomes visible to members; player actions become available according to league/fixture state. | **DELIVERED · P0** |
| **ADM-014** | As an administrator, I want to close a season so that its final table becomes historical and ordinary new results stop. | New normal submissions are blocked; existing fixtures/results remain readable; controlled admin corrections remain possible. | **DELIVERED · P0** |
| **ADM-015** | As an administrator, I want completed seasons retained so that the club has a durable competitive record. | Closing never deletes historical leagues, memberships, fixtures, results or final standings context. | **DELIVERED · P1** |
| **ADM-016** | As an administrator, I want to identify the current season so that admin and player interfaces default to the relevant competition. | One intended current season is clearly selected; historic seasons remain accessible separately; no data is inferred purely from naming. | **DELIVERED · P1** |
| **ADM-017** | As an administrator, I want to safely delete an empty draft season created by mistake so that setup clutter can be removed without risky data deletion. | Deletion is allowed only when no protected league/fixture/result history exists; confirmation is explicit; backend enforces safety. | **DELIVERED · P2** |
| **ADM-018** | As an administrator, I want to create the next season from the previous season's structural configuration so that annual setup is quick. | May copy league names/order/rules/promotion settings; never copies old results, fixtures or invitation tokens; target season has new IDs. | **DELIVERED · P1** |

## 4.3 League and division structure

| ID | User story | Acceptance criteria | State |
|---|---|---|---|
| **ADM-019** | As an administrator, I want to create one or more leagues inside a season so that players can compete in divisions. | League belongs to exactly one season; receives stable ID/name; multiple leagues can coexist in one season. | **DELIVERED · P0** |
| **ADM-020** | As an administrator, I want to rename a league without recreating it so that division naming can change without losing history. | Stable league identity is preserved; memberships/fixtures/results remain attached; new name appears consistently. | **DELIVERED · P1** |
| **ADM-021** | As an administrator, I want to order leagues explicitly so that the system knows the divisional hierarchy. | Hierarchy/order is persisted; top and bottom leagues are deterministic; order does not depend on alphabetical names. | **DELIVERED · P0** |
| **ADM-022** | As an administrator, I want to set league capacity so that divisions cannot silently overfill. | Capacity is persisted and validated on assignments/invites; admin can see current active count versus capacity. | **DELIVERED · P0** |
| **ADM-023** | As an administrator, I want to configure matches per player pair so that single, double or triple round-robin formats are possible. | Positive supported repeat count is persisted; fixture generation uses it exactly; duplicate meetings remain separately identifiable. | **DELIVERED · P0** |
| **ADM-024** | As an administrator, I want to configure the legs-to-win format for a league so that result validation follows the competition rules. | Supported target is persisted; normal result entry validates decisive scores; rule is visible to players. | **DELIVERED · P0** |
| **ADM-025** | As an administrator, I want to configure points per win so that standings use the intended scoring system. | Value is persisted; only confirmed results award points; changing it after competition starts is protected. | **DELIVERED · P0** |
| **ADM-026** | As an administrator, I want to control league public/private visibility so that the club deliberately chooses what visitors can see. | PUBLIC data is readable without login; PRIVATE league data requires permitted access; private identity fields never leak. | **DELIVERED · P0** |
| **ADM-027** | As an administrator, I want to share a stable public league link so that members and friends can open exactly that competition. | Link resolves the intended season/league; native share or clipboard fallback works; private leagues do not expose public share behaviour. | **DELIVERED · P1** |
| **ADM-028** | As an administrator, I want to see all leagues in a season at once so that the complete divisional structure is obvious. | List shows ordered league names, status/configuration summary and membership counts; selection is explicit. | **DELIVERED · P1** |
| **ADM-029** | As an administrator, I want to safely remove an empty league created by mistake so that draft setup can be corrected. | Only leagues without protected competition history can be removed; confirmation is required; backend prevents orphaning data. | **DELIVERED · P2** |
| **ADM-030** | As an administrator, I want protection when changing consequential league rules after fixtures or results exist so that historic competition meaning cannot silently change. | Backend detects protected state; action is rejected or requires a deliberate corrective workflow; existing confirmed results remain deterministic. | **DELIVERED · P0** |

## 4.4 League membership and invitations

| ID | User story | Acceptance criteria | State |
|---|---|---|---|
| **ADM-031** | As an administrator, I want to assign a club player to a specific season and league so that competitive membership is explicit. | Membership records player + season + league; assignment persists; league capacity and account status are validated. | **DELIVERED · P0** |
| **ADM-032** | As an administrator, I want to see the complete membership of each league so that I can verify divisions before competition starts. | Roster is league/season scoped; active/inactive state is visible; count is compared with capacity. | **DELIVERED · P0** |
| **ADM-033** | As an administrator, I want to see players who are not assigned to any league in the current season so that nobody is accidentally omitted. | Unassigned list is derived from active club accounts versus current-season league membership; assignment action is available. | **DELIVERED · P1** |
| **ADM-034** | As an administrator, I want one player prevented from accidentally occupying multiple competing leagues in the same season so that standings and fixtures remain coherent. | Backend uniqueness/invariant prevents duplicate active divisional membership unless a future explicit rule allows it. | **DELIVERED · P0** |
| **ADM-035** | As an administrator, I want to move a player between leagues before fixtures are committed so that setup mistakes are easy to fix. | Source membership is changed to target league; target capacity is enforced; player does not remain duplicated. | **DELIVERED · P0** |
| **ADM-036** | As an administrator, I want changes to league membership protected once fixtures exist so that fixtures cannot become orphaned or contradictory. | System identifies affected fixtures; silent move is prohibited; admin must resolve/regenerate safely. | **DELIVERED · P0** |
| **ADM-037** | As an administrator, I want to deactivate a league membership without deleting history so that withdrawals can be represented safely. | Historic fixtures/results remain; player cannot create new normal results while inactive; standings policy is deterministic. | **DELIVERED · P0** |
| **ADM-038** | As an administrator, I want to reactivate a league membership where appropriate so that a returning competitor can continue. | Existing membership is reused; duplicate membership is not created; valid outstanding fixtures become available as rules permit. | **DELIVERED · P1** |
| **ADM-039** | As an administrator, I want to copy previous-season league placements as a draft starting point so that next-season setup does not start from zero. | Copies players into new season memberships only after review; previous-season membership remains immutable; promotions/overrides can then alter target placement. | **DELIVERED · P1** |
| **ADM-040** | As an administrator, I want to create an invitation for a specific season and league so that a new player joins the intended division. | Invite is scoped to season/league; raw token is only returned for sharing and stored hashed; capacity/status are checked on acceptance. | **DELIVERED · P0** |
| **ADM-041** | As an administrator, I want to copy/share a newly created invite link so that I can send it to the intended player. | Clipboard/native behaviour provides the correct URL; failure leaves the URL visible/copyable; no secret token appears in public APIs. | **DELIVERED · P1** |
| **ADM-042** | As an administrator, I want to see active and historical invite state so that I know which links remain usable. | Usage, expiry and revocation state are visible; list is scoped appropriately; token material itself is not re-exposed. | **DELIVERED · P1** |
| **ADM-043** | As an administrator, I want to revoke an invite so that an old or compromised link can no longer admit players. | Explicit action revokes server-side; revoked invite cannot be joined; existing valid memberships remain. | **DELIVERED · P0** |
| **ADM-044** | As an administrator, I want invitation acceptance to be idempotent so that using the same valid link twice cannot create duplicate membership. | Existing membership is returned/recognised; no duplicate row or capacity consumption occurs. | **DELIVERED · P0** |
| **ADM-045** | As an administrator, I want concurrent joins to respect league capacity so that two players cannot race past the configured limit. | Capacity is enforced transactionally/atomically enough for D1 club scale; over-capacity join fails without partial membership. | **DELIVERED · P0** |

## 4.5 Fixture generation and management

| ID | User story | Acceptance criteria | State |
|---|---|---|---|
| **ADM-046** | As an administrator, I want to automatically generate every required league fixture so that the competition has a complete backend schedule of pairings. | Every unordered active-player pair receives exactly `matches_per_pair` fixtures; no self-fixtures; generated count matches the round-robin formula. | **DELIVERED · P0** |
| **ADM-047** | As an administrator, I want to preview fixture generation before committing it so that I can catch wrong membership or rules. | Preview shows season, league, player count, repeat count, expected fixture count and pairings; no database fixtures are created yet. | **DELIVERED · P1** |
| **ADM-048** | As an administrator, I want to commit the previewed fixtures to the backend so that every fixture has a durable identity shared by all clients. | Fixtures are persisted with stable IDs and season/league/player references; successful commit is all-or-safe-failure. | **DELIVERED · P0** |
| **ADM-049** | As an administrator, I want fixture generation protected against duplicate execution so that double-clicks or retries cannot double the competition. | Re-running the same generation cannot create duplicate equivalent fixtures; backend enforces the invariant. | **DELIVERED · P0** |
| **ADM-050** | As an administrator, I want fixtures grouped into sensible rounds/order so that the competition can be followed as a structured round robin. | Every fixture has deterministic round/order metadata; where mathematically possible a player appears at most once per round; odd rosters produce byes. | **DELIVERED · P1** |
| **ADM-051** | As an administrator, I want multiple meetings between the same pair represented as distinct fixtures so that double/triple round robins remain unambiguous. | Each meeting has distinct fixture ID and meeting/round identity; one result can settle only one meeting. | **DELIVERED · P0** |
| **ADM-052** | As an administrator, I want to see all fixtures for a league so that I can understand competition progress. | Fixture list is league/season scoped and identifies players, round/order and current state. | **DELIVERED · P0** |
| **ADM-053** | As an administrator, I want to filter fixtures by outstanding, pending confirmation, disputed and completed state so that weekly admin work is obvious. | Filter counts and rows derive from persisted fixture/result state; no fixture disappears because a result is disputed. | **DELIVERED · P1** |
| **ADM-054** | As an administrator, I want a clear outstanding-fixture count so that I can see how much of a league remains unplayed. | Count derives from fixture records, not inferred pair maths; completed/void fixtures are excluded according to defined rules. | **DELIVERED · P1** |
| **ADM-055** | As an administrator, I want to regenerate fixtures safely before competition starts so that membership mistakes can be corrected. | Allowed only when protected result history does not exist; old generated fixtures are replaced safely; new set matches current roster/rules. | **DELIVERED · P1** |
| **ADM-056** | As an administrator, I want destructive fixture regeneration blocked once results exist so that official competition history cannot be orphaned. | Confirmed/pending/disputed result links prevent silent regeneration; admin receives actionable reason. | **DELIVERED · P0** |
| **ADM-057** | As an administrator, I want to void an exceptional fixture without deleting it so that withdrawals or club rulings can preserve the audit trail. | VOID state is explicit; fixture remains historical; standings/result effects are defined; only authorised admin can do it. | **DELIVERED · P2** |
| **ADM-058** | As an administrator, I want to restore an accidentally voided fixture where safe so that an admin mistake can be corrected. | Restoration is blocked if contradictory replacement state exists; action is audited; fixture returns to appropriate outstanding state. | **DELIVERED · P2** |
| **ADM-059** | As an administrator, I want fixture/player integrity validated before generation so that suspended, inactive, duplicated or unassigned players cannot silently create bad fixtures. | Validation reports blocking roster issues before commit; generation cannot partially proceed with invalid membership. | **DELIVERED · P0** |

## 4.6 Results, disputes and standings integrity

| ID | User story | Acceptance criteria | State |
|---|---|---|---|
| **ADM-060** | As an administrator, I want ordinary league results to settle an existing fixture so that every official match corresponds to scheduled competition. | Result references fixture ID; participants match fixture; fixture cannot be officially settled twice. | **DELIVERED · P0** |
| **ADM-061** | As an administrator, I want to enter a historical/manual result against an outstanding fixture so that valid games can be recorded when players did not use the normal flow. | Admin selects fixture; players are fixed from it; valid legs/averages are entered; result becomes official according to admin workflow. | **DELIVERED · P0** |
| **ADM-062** | As an administrator, I want to see pending results requiring opponent confirmation so that unresolved matches can be chased. | Queue shows fixture, submitter, opponent, score, averages and age/status. | **DELIVERED · P1** |
| **ADM-063** | As an administrator, I want to see disputed results and dispute notes so that I can settle disagreements. | Disputed record never affects standings; note and fixture context are visible; admin has resolution actions. | **DELIVERED · P0** |
| **ADM-064** | As an administrator, I want to confirm an unresolved result when appropriate so that a match can be settled without blocking the league indefinitely. | Authorised admin can confirm; fixture becomes completed; standings update once; action is audited. | **DELIVERED · P0** |
| **ADM-065** | As an administrator, I want to edit an erroneous result so that players, score, averages or state can be corrected. | Server validates corrected data; associated fixture remains coherent; standings recalculate from final confirmed state. | **DELIVERED · P0** |
| **ADM-066** | As an administrator, I want to delete a completely invalid result so that it no longer affects competition. | Explicit confirmation; result removed/soft-deleted per audit design; standings effect is reversed; fixture returns to correct state. | **DELIVERED · P0** |
| **ADM-067** | As an administrator, I want result mutations audited so that important changes to the official table are accountable. | Actor, action, timestamp and material before/after values are reconstructable; players cannot alter audit records. | **DELIVERED · P0** |
| **ADM-068** | As an administrator, I want standings recalculated from confirmed results rather than manually edited totals so that the table is a deterministic view of official matches. | Pending/disputed/void data contributes nothing; correction/deletion changes derived totals correctly. | **DELIVERED · P0** |
| **ADM-069** | As an administrator, I want standings scoped to one season and league so that divisions never contaminate each other's tables. | Only confirmed results from fixtures in the selected season+league are aggregated. | **DELIVERED · P0** |
| **ADM-070** | As an administrator, I want the standings tie-break order explicitly configured or fixed by an approved rule so that equal-points positions are deterministic. | Ordering rule is documented and tested; same dataset always yields same rank; rule is visible enough to explain the table. | **GATED · P0** |
| **ADM-071** | As an administrator, I want rule-changing actions protected after confirmed results exist so that points/format changes cannot silently rewrite a live table. | Backend blocks or requires explicit migration/corrective workflow; impact is shown before action. | **DELIVERED · P0** |

## 4.7 Promotion, relegation and next-season placement

| ID | User story | Acceptance criteria | State |
|---|---|---|---|
| **ADM-072** | As an administrator, I want to configure how many automatic promotion places a league has so that upward movement is explicit. | Non-negative count is stored; top league may have zero; value cannot exceed sensible membership bounds. | **DELIVERED · P0** |
| **ADM-073** | As an administrator, I want to configure how many automatic relegation places a league has so that downward movement is explicit. | Non-negative count is stored; bottom league may have zero; value cannot exceed sensible membership bounds. | **DELIVERED · P0** |
| **ADM-074** | As an administrator, I want promotion/relegation destinations derived from the ordered league hierarchy so that players move to the correct adjacent division. | Destination is deterministic from hierarchy or explicitly configured; top/bottom edge cases are safe. | **DELIVERED · P0** |
| **ADM-075** | As an administrator, I want to see projected promotion and relegation zones during the season so that likely movement is obvious. | Projection uses current standings; is clearly labelled provisional; unresolved ties follow approved rule or show ambiguity. | **DELIVERED · P1** |
| **ADM-076** | As an administrator, I want end-of-season promotion/relegation candidates calculated from the final table so that next-season setup is consistent. | Only closed/final eligible standings are used; unresolved disputes block finalisation; rule produces deterministic candidate set. | **DELIVERED · P0** |
| **ADM-077** | As an administrator, I want to review the proposed movements before applying them so that withdrawals, new players or club judgement can be handled. | Proposal is a preview; previous-season membership is immutable; no next-season membership is written until confirmed. | **DELIVERED · P0** |
| **ADM-078** | As an administrator, I want to override an individual proposed movement so that exceptional club decisions can be represented deliberately. | Override requires explicit target league and reason/audit note where appropriate; capacities/invariants are revalidated. | **DELIVERED · P1** |
| **ADM-079** | As an administrator, I want to apply the approved promotion/relegation plan to the next season so that new league memberships are created automatically. | New membership rows point to the new season/leagues; old membership is untouched; operation is safe against duplicate application. | **DELIVERED · P0** |
| **ADM-080** | As an administrator, I want to place new or returning players manually into next-season leagues so that the promotion algorithm is not the only source of membership. | Admin can assign an eligible account; capacity and one-league-per-season rule are enforced. | **DELIVERED · P1** |
| **ADM-081** | As an administrator, I want to review every player's proposed next-season placement before fixtures are generated so that the new season begins from an intentional roster. | Each active competitor is assigned once or clearly listed unassigned; no fixtures can be committed while blocking membership issues remain. | **DELIVERED · P0** |
| **ADM-082** | As an administrator, I want promotion/relegation history preserved so that the club can explain how a player moved between divisions. | Previous and next memberships remain queryable; approved movement/override is reconstructable; history is never rewritten by later seasons. | **DELIVERED · P1** |

## 4.8 Operational clarity and data integrity

| ID | User story | Acceptance criteria | State |
|---|---|---|---|
| **ADM-083** | As an administrator, I want a concise season health view so that I can see unresolved setup or competition work. | Shows at least unassigned players, outstanding fixtures, pending confirmations and disputes for selected season. | **DELIVERED · P1** |
| **ADM-084** | As an administrator, I want all destructive actions to require clear confirmation so that mobile mis-taps do not damage competition data. | Custom accessible confirmation is used where consequence is material; cancel is safe; focus returns sensibly. | **DELIVERED · P0** |
| **ADM-085** | As an administrator, I want server-side validation errors expressed clearly so that I know why a competition action failed. | Validation/authorization conflicts return stable non-secret errors; UI preserves entered data where practical and shows actionable message. | **DELIVERED · P1** |
| **ADM-086** | As an administrator, I want refresh/reload behaviour to show backend truth so that local browser state cannot become the competition authority. | Reload reconstructs season/league/membership/fixture/result state from APIs; stale responses cannot overwrite a newly selected league. | **DELIVERED · P0** |
| **ADM-087** | As an administrator, I want mobile administration to remain fully usable so that club operation does not require a laptop at the board. | Core controls meet touch target/accessibility requirements; forms reflow; no essential task is desktop-only. | **DELIVERED · P1** |
| **ADM-088** | As an administrator, I want desktop administration to present the same authoritative functions efficiently so that larger setup tasks are comfortable. | Desktop uses deliberate admin navigation/rails; no feature discrepancy from mobile; tables/forms remain accessible. | **DELIVERED · P1** |

---

# 5. Player user stories

## 5.1 Identity, onboarding and profile

| ID | User story | Acceptance criteria | State |
|---|---|---|---|
| **PLY-001** | As a player, I want to sign in with Google so that I do not need another club password. | Worker verifies identity; secure session created; invalid credentials rejected; browser cannot choose its own user/role. | **DELIVERED · P0** |
| **PLY-002** | As an invited player, I want the invite I opened to survive Google sign-in so that authentication does not lose the league I intended to join. | Pending invite is retained safely through sign-in/onboarding; server revalidates it after authentication. | **DELIVERED · P0** |
| **PLY-003** | As a new player, I want to choose my club nickname so that the table and results use the name the club recognises. | Required/validated nickname is stored; appropriate uniqueness/reserved-name rules apply; display updates consistently. | **DELIVERED · P1** |
| **PLY-004** | As an invited player, I want accepting an invite to place me into the correct season and league so that I immediately see the right competition. | Membership created exactly once; season/league/capacity/status validated; failed invite gives understandable reason. | **DELIVERED · P0** |
| **PLY-005** | As a player, I want to sign out so that my account is not left active on a shared device. | Session/logout state clears appropriately; protected content/actions no longer accessible from the signed-out UI. | **DELIVERED · P0** |
| **PLY-006** | As a player, I want to edit my nickname so that my visible club identity can stay accurate. | Valid change persists server-side; standings/results display updated name without rewriting result ownership. | **DELIVERED · P1** |
| **PLY-007** | As a player, I want to link my official DartCounter profile so that fellow members can open my scoring profile externally. | Only permitted safe HTTPS DartCounter URL is stored; malformed/unsafe host is rejected; external link is rendered safely. | **DELIVERED · P2** |
| **PLY-008** | As a player, I want my Google profile image used where available so that my account is easy to recognise. | Verified profile image is displayed; absence has a usable fallback; arbitrary upload is not required. | **DELIVERED · P2** |
| **PLY-009** | As a suspended player, I want the application to clearly deny protected actions so that account state is predictable rather than failing silently. | Protected APIs reject mutation; UI gives understandable access state; public material remains subject to normal public rules. | **DELIVERED · P1** |

## 5.2 Season and league context

| ID | User story | Acceptance criteria | State |
|---|---|---|---|
| **PLY-010** | As a player, I want to see the seasons I belong to so that current and historical competition are distinct. | Authenticated season list is derived from membership; selected season is explicit; historic data is not merged into current. | **DELIVERED · P1** |
| **PLY-011** | As a player, I want to see which league/division I belong to in each season so that my competitive placement is obvious. | UI shows season + league together; backend membership is the source; no placement is inferred from current account alone. | **DELIVERED · P0** |
| **PLY-012** | As a player, I want my current season and league selected by default so that the weekly view opens in the most relevant place. | Valid current membership is preferred; fallback is deterministic; manual selection remains possible. | **DELIVERED · P1** |
| **PLY-013** | As a player, I want to switch between seasons I am allowed to view so that I can inspect previous competition. | Selection reloads the corresponding leagues/fixtures/results; race/stale responses do not overwrite the latest selection. | **DELIVERED · P1** |
| **PLY-014** | As a player, I want to inspect other public leagues in the current season so that I can follow the rest of the club. | Public leagues are viewable without granting member mutation rights; my own league is clearly identified. | **DELIVERED · P2** |
| **PLY-015** | As a player, I want private league data limited to leagues I am permitted to see so that signing in does not expose every private division automatically. | Server checks membership/admin permission; guessing ID/slug cannot bypass private visibility. | **DELIVERED · P0** |
| **PLY-016** | As a player, I want the league's key rules visible so that I understand match format and points. | Shows legs-to-win, points per win and relevant meetings-per-pair information without exposing admin-only controls. | **DELIVERED · P1** |
| **PLY-017** | As a player, I want closed seasons clearly marked so that I know I am viewing history rather than an active competition. | Status is visible; normal result entry is unavailable; historical data remains readable. | **DELIVERED · P1** |

## 5.3 League table and players

| ID | User story | Acceptance criteria | State |
|---|---|---|---|
| **PLY-018** | As a player, I want to see the standings for my specific season and league so that I know my competitive position. | Aggregation includes only confirmed results from that season+league; no other division contributes. | **DELIVERED · P0** |
| **PLY-019** | As a player, I want my own row highlighted so that I can find myself quickly on a phone. | Highlight is visual but accessible; table semantics remain intact. | **DELIVERED · P1** |
| **PLY-020** | As a player, I want standings to show useful league totals so that the table is understandable. | At minimum position, player, played, won/lost, points and agreed tie-break/stat columns are present and labelled. | **DELIVERED · P1** |
| **PLY-021** | As a player, I want only confirmed results to affect the table so that unverified or disputed games cannot move positions. | Pending/disputed results contribute zero; confirmation updates once; deletion/correction adjusts derived totals. | **DELIVERED · P0** |
| **PLY-022** | As a player, I want equal-points ordering to follow a published deterministic rule so that league position is explainable. | Rule matches backend calculation and is discoverable; ambiguous promotion positions are not silently guessed. | **GATED · P0** |
| **PLY-023** | As a player, I want promotion positions visible where configured so that I know what I am competing for. | Promotion zone corresponds to league rules; labelled provisional until season finalised. | **DELIVERED · P1** |
| **PLY-024** | As a player, I want relegation positions visible where configured so that the consequences of the table are clear. | Relegation zone corresponds to league rules; labelled provisional until finalised. | **DELIVERED · P1** |
| **PLY-025** | As a player, I want to see the players in my league so that I know my opponents. | Roster is season+league scoped; current user is identifiable; inactive members are handled consistently. | **DELIVERED · P1** |

## 5.4 Fixtures

| ID | User story | Acceptance criteria | State |
|---|---|---|---|
| **PLY-026** | As a player, I want to see my complete fixture list so that I know every league match I am expected to play. | List is derived from persisted backend fixtures; only fixtures involving the player appear in My Fixtures. | **DELIVERED · P0** |
| **PLY-027** | As a player, I want outstanding fixtures easy to identify so that I immediately know who I still need to play. | Outstanding state is explicit; opponent and round/order are visible; completed fixtures are not mixed ambiguously. | **DELIVERED · P0** |
| **PLY-028** | As a player, I want completed fixtures linked to their official result so that I can review games already played. | Completed fixture opens/shows confirmed score and averages; it cannot be submitted again normally. | **DELIVERED · P1** |
| **PLY-029** | As a player, I want pending-confirmation fixtures visible so that a submitted game does not disappear while waiting for my opponent. | Fixture shows pending state, result summary and who must act next. | **DELIVERED · P0** |
| **PLY-030** | As a player, I want disputed fixtures visible so that I know a match is under review rather than missing. | Disputed state remains in fixture/history; standings are unaffected until resolution; dispute context is appropriately visible. | **DELIVERED · P0** |
| **PLY-031** | As a player, I want to see all fixtures in my league so that I can follow overall competition progress. | League fixture list is permission/visibility scoped; rows show players and state; my matches can be highlighted. | **DELIVERED · P1** |
| **PLY-032** | As a player, I want to see how many fixtures I have played and how many remain so that my own season progress is obvious. | Counts derive from fixture state; pending/disputed are represented deliberately rather than counted as confirmed. | **DELIVERED · P1** |
| **PLY-033** | As a player, I want to see overall league fixture progress so that I know how far through the competition the division is. | Played/total/outstanding values derive from persisted fixtures and confirmed/void rules. | **DELIVERED · P2** |
| **PLY-034** | As a player, I want multiple scheduled meetings with the same opponent distinguished so that I know which fixture I am settling. | Meeting/round identity is shown enough to differentiate; one result settles only that fixture. | **DELIVERED · P0** |
| **PLY-035** | As a player, I want void fixtures clearly identified so that a club ruling is visible rather than looking like an unplayed match forever. | VOID is readable and does not invite result entry; any standings consequence follows explicit rule. | **DELIVERED · P2** |

## 5.5 Recording and settling results

| ID | User story | Acceptance criteria | State |
|---|---|---|---|
| **PLY-036** | As a player, I want to record a result by opening one of my outstanding fixtures so that I do not choose an arbitrary opponent. | Fixture determines league and both players; only eligible participant can start submission; non-outstanding fixture is blocked. | **DELIVERED · P0** |
| **PLY-037** | As a player, I want to enter both players' leg scores so that the official match result is captured. | Scores are numeric, in range and decisive according to league target; impossible/tied invalid outcomes are rejected. | **DELIVERED · P0** |
| **PLY-038** | As a player, I want to enter both DartCounter three-dart averages so that the league retains agreed performance information. | Finite allowed range and precision are validated server-side; values are stored against the fixture result. | **DELIVERED · P1** |
| **PLY-039** | As a player, I want to submit my entered fixture result to my opponent for confirmation so that I cannot unilaterally alter the official table. | Result becomes PENDING; submitter is recorded; fixture reflects pending confirmation; standings remain unchanged. | **DELIVERED · P0** |
| **PLY-040** | As the submitting player, I want to see my own pending result so that I know it is waiting rather than lost. | My pending submissions are visible with fixture/opponent/result and pending state; I am not offered self-confirmation. | **DELIVERED · P1** |
| **PLY-041** | As the opponent, I want to see results awaiting my review so that I know when I must confirm or dispute a match. | Only results where I am the non-submitting participant appear as actionable; fixture context and entered values are clear. | **DELIVERED · P0** |
| **PLY-042** | As the opponent, I want to confirm an accurate result so that the fixture becomes official. | Only eligible opponent can confirm; result becomes CONFIRMED; fixture becomes completed; standings update exactly once. | **DELIVERED · P0** |
| **PLY-043** | As the opponent, I want to dispute an inaccurate result so that it cannot affect standings until checked. | Only eligible opponent can dispute; note is required/validated; state becomes DISPUTED; standings remain unchanged. | **DELIVERED · P0** |
| **PLY-044** | As the opponent, I want to explain the dispute so that the administrator knows what needs checking. | Required note has sensible length limit; stored safely; accessible to appropriate admin and involved players as designed. | **DELIVERED · P1** |
| **PLY-045** | As either player, I want the admin-resolved result to show the final official values so that I know how the fixture was settled. | After resolution, refreshed fixture/result shows final state; confirmed resolution affects standings once. | **DELIVERED · P1** |
| **PLY-046** | As a player, I want duplicate submissions against an already-settled fixture rejected so that one match cannot score twice. | Backend checks fixture state/linked result; repeated request fails safely or returns existing pending submission where idempotent design allows. | **DELIVERED · P0** |
| **PLY-047** | As a player, I want submissions for fixtures I do not belong to rejected so that I cannot record another league's matches. | Backend validates session user is fixture participant and active eligible member; manipulated IDs are rejected. | **DELIVERED · P0** |
| **PLY-048** | As a player, I want result entry unavailable when my season/league is closed or my membership is inactive so that competition state is consistently enforced. | UI disables/hides normal action and backend rejects bypass attempts with clear reason. | **DELIVERED · P0** |
| **PLY-049** | As a player, I want result submission failures to preserve what I entered where safe so that a temporary error does not force me to retype the match. | Validation/error is visible; no duplicate backend result is created; form state is retained for recoverable failures. | **DELIVERED · P2** |

## 5.6 History, promotion and next season

| ID | User story | Acceptance criteria | State |
|---|---|---|---|
| **PLY-050** | As a player, I want previous seasons to remain viewable so that I can see my club history. | Historic season, league, fixtures/results and final table remain linked; current competition is not mixed in. | **GATED/PARTIAL · P2** |
| **PLY-051** | As a player, I want historical seasons to show the league I actually played in then so that later promotion/relegation does not rewrite my record. | Old league membership is immutable and queryable; history displays season+league explicitly. | **DELIVERED · P0** |
| **PLY-052** | As a player, I want projected promotion/relegation clearly labelled during a live season so that I can understand my likely movement without mistaking it for a final decision. | Projection is visible only when configured; clearly provisional; tie ambiguity is surfaced. | **DELIVERED · P1** |
| **PLY-053** | As a player, I want to see my confirmed end-of-season movement so that I know where I will compete next. | Approved outcome is distinguishable from projection; target season/league is shown when available. | **DELIVERED · P1** |
| **PLY-054** | As a promoted or relegated player, I want the next season to show my new league while retaining all previous league history. | New season membership points to target league; previous memberships/results remain untouched. | **DELIVERED · P0** |
| **PLY-055** | As a player who is not yet assigned for the next season, I want that state explained rather than being shown the wrong league. | UI says placement is pending/unassigned; no fabricated league membership; admin can resolve separately. | **DELIVERED · P1** |

---

# 6. Public visitor stories

Public behaviour is deliberately limited. Misfits 501 remains private-club-first.

| ID | User story | Acceptance criteria | State |
|---|---|---|---|
| **PUB-001** | As a visitor, I want to open Misfits 501 without signing in so that I can see deliberately public club competition information. | Public entrance works without authentication; no private member/account data is leaked. | **DELIVERED · P1** |
| **PUB-002** | As a visitor, I want to choose among public seasons/leagues so that I can inspect the competition I care about. | Only public/viewable competitions appear; direct links resolve the intended context. | **DELIVERED · P1** |
| **PUB-003** | As a visitor, I want to see a public league table so that I can follow standings. | Only confirmed results contribute; table is league+season scoped; private fields never appear. | **DELIVERED · P1** |
| **PUB-004** | As a visitor, I want to see recent confirmed results so that I can understand what changed in the table. | Pending/disputed results are excluded; result shows appropriate public score/average information only. | **DELIVERED · P1** |
| **PUB-005** | As a visitor, I want to see public fixtures if the club chooses to expose them so that I can follow upcoming/outstanding pairings. | Only fixtures from PUBLIC competition are returned; no private account details; fixture state is clear. | **DELIVERED · P2** |
| **PUB-006** | As a visitor, I want to share a stable public league link so that another person opens the same season/division. | Native share or clipboard fallback points to selected public league; private competition is never exposed by fallback. | **DELIVERED · P2** |
| **PUB-007** | As a visitor, I want private leagues to behave as unavailable rather than leaking their existence/details so that privacy is preserved. | Public API does not expose protected data; direct guessed URLs cannot reveal private roster/results. | **DELIVERED · P0** |

---

# 7. Competition invariants

These are not optional UI details. They are domain rules that should have focused automated tests.

1. Misfits 501 is one club.
2. A Season has a stable identity independent of its display name.
3. A League belongs to exactly one Season.
4. League hierarchy is explicit rather than inferred from names.
5. A League Membership maps one user to one season and one league.
6. A user cannot accidentally hold multiple active competing league memberships in the same season.
7. Historical league membership is immutable when the player changes division in a later season.
8. A Fixture belongs to exactly one season and league.
9. Both fixture players must be distinct eligible members of that league when the fixture set is committed.
10. A player can never be paired with themselves.
11. Fixture generation must produce the correct number of pairings.
12. For `N` players meeting `R` times, expected fixture count is `N × (N - 1) / 2 × R`.
13. Examples: 8 players once = 28; 10 once = 45; 10 twice = 90; 12 once = 66.
14. Re-running fixture generation must not create duplicate equivalent fixtures.
15. Multiple meetings between the same players must remain distinguishable fixtures.
16. A normal league Result references exactly one Fixture.
17. Result participants must match fixture participants.
18. A fixture cannot contribute more than one confirmed result to standings.
19. Only an eligible fixture participant may submit through the normal player flow.
20. A submitter cannot confirm their own pending result.
21. Pending results do not affect standings.
22. Disputed results do not affect standings.
23. Confirmed results affect standings exactly once.
24. Deleting/correcting a confirmed result reverses/recalculates its standings effect correctly.
25. Standings are scoped to exactly one season and league.
26. Closed competition state rejects ordinary player result submission.
27. Suspended accounts cannot perform protected mutations.
28. Inactive league memberships cannot create ordinary new competition results.
29. Promotion/relegation never mutates previous-season membership.
30. Applying next-season placement creates new membership records.
31. Promotion/relegation finalisation must not silently guess an unresolved tie.
32. Admin role/access, membership, fixture and result integrity are enforced by the Worker, not merely hidden controls.
33. Public APIs never return session tokens, invite tokens/hashes, Google subjects or private member email addresses.
34. All state-changing requests preserve the existing same-origin/security boundary.

---

# 8. Recommended navigation target

## Player

```text
Season selector
  -> League context
      -> Table
      -> Fixtures
      -> Results
      -> Players
      -> Profile
```

The current free-form `Add result` flow should evolve into:

```text
Fixtures
  -> Outstanding fixture
      -> Record result
          -> Opponent confirmation / dispute
              -> Confirmed result settles fixture
```

## Administrator

```text
Season Admin
  -> Season
      -> lifecycle / current season / next season
  -> Leagues
      -> structure / order / rules / visibility / promotion options
  -> Members & Invites
      -> league memberships / unassigned / moves / invites
  -> Fixtures
      -> validate / preview / generate / outstanding / void
  -> Results
      -> pending / disputed / confirmed / correction
  -> Club Access
      -> roles / suspension / recovery protection
```

---

# 9. Delivery epics

The backlog should be implemented in dependency order rather than by picking isolated stories.

## Epic 1 — Competition model

- separate Season and League concepts;
- league hierarchy;
- season+league membership;
- migrate/preserve current competition history safely.

Primary stories: ADM-010–045, PLY-010–025.

## Epic 2 — Fixture engine

- round-robin generation;
- preview;
- backend persistence;
- duplicate protection;
- fixture lists/states.

Primary stories: ADM-046–059, PLY-026–035.

## Epic 3 — Fixture-based result settlement

- result references fixture;
- player submission from fixture;
- opponent confirmation/dispute;
- admin resolution/correction;
- standings remain confirmed-only.

Primary stories: ADM-060–071, PLY-036–049.

## Epic 4 — Promotion/relegation and season rollover

- league promotion/relegation options;
- provisional zones;
- final candidate calculation;
- admin review/override;
- new-season membership creation.

Primary stories: ADM-072–082, PLY-050–055.

## Epic 5 — Full functional regression audit

Every story in this file is tested against production/current main and classified with evidence:

```text
PASS
PARTIAL
FAIL
NOT IMPLEMENTED
BLOCKED / DECISION REQUIRED
```

P0/P1 failures become the prioritised implementation backlog.

---

# 10. Explicitly not part of the current approved baseline

Unless separately approved, do not silently expand this backlog into:

- live dart-by-dart scoring;
- replacement of DartCounter;
- multi-club tenancy or white-label clubs;
- payments/subscriptions;
- tournaments/knockouts;
- doubles/teams;
- messaging/chat;
- WhatsApp automation;
- push/email notifications;
- venue booking;
- paid Cloudflare services;
- queues, R2/object storage, Durable Objects or scheduled background work;
- arbitrary profile image uploads;
- complex fixture calendar/date scheduling;
- postponement workflows;
- playoff engines;
- advanced statistics, streaks, head-to-head or player leaderboards until separately prioritised;
- public player biographies/social profiles until privacy/visibility is approved.

Persisted fixture **pairings** and promotion/relegation **league movement** are now approved and are not gated by the older specs.

---

# 11. Definition of done for every story

A story is not complete because a button exists.

- [ ] Authoritative behaviour exists in the backend wherever persisted competition state is involved.
- [ ] Authentication/authorization is enforced server-side.
- [ ] Domain validation exists for invalid and adversarial inputs.
- [ ] The happy path has focused automated coverage where practical.
- [ ] Important rejection paths have automated coverage.
- [ ] Existing regression tests continue to pass.
- [ ] Loading, empty, success and failure states are understandable.
- [ ] Mobile interaction is usable at board-side widths.
- [ ] Desktop interaction remains first-class for administration and tables.
- [ ] Keyboard/focus/semantic accessibility is preserved.
- [ ] Mutations cannot silently duplicate, orphan or corrupt competition state.
- [ ] Destructive changes are explicit and recoverable where the domain allows.
- [ ] Refreshing/reopening the application reproduces backend truth.
- [ ] Public/private data boundaries remain intact.

---

# 12. Target end-to-end lifecycle

```text
ADMIN CREATES SEASON
        ↓
ADMIN CREATES & ORDERS LEAGUES
        ↓
ADMIN CONFIGURES LEAGUE RULES + PROMOTION OPTIONS
        ↓
ADMIN MAPS PLAYERS TO SEASON + LEAGUE
        ↓
ADMIN REVIEWS UNASSIGNED / INVALID MEMBERSHIP
        ↓
ADMIN PREVIEWS FIXTURE GENERATION
        ↓
ADMIN COMMITS FIXTURES TO BACKEND
        ↓
PLAYER OPENS OUTSTANDING FIXTURE
        ↓
PLAYER RECORDS AGREED DARTCOUNTER RESULT
        ↓
OPPONENT CONFIRMS OR DISPUTES
        ↓
CONFIRMED RESULT SETTLES FIXTURE
        ↓
LEAGUE TABLE RECALCULATES
        ↓
SEASON PROGRESSES UNTIL FIXTURES COMPLETE
        ↓
FINAL TABLE
        ↓
PROMOTION / RELEGATION PROPOSAL
        ↓
ADMIN REVIEWS / OVERRIDES MOVEMENTS
        ↓
NEXT SEASON CREATED
        ↓
NEW SEASON + LEAGUE MEMBERSHIPS WRITTEN
        ↓
NEW FIXTURES GENERATED
```

That lifecycle is the functional backbone of Misfits 501.
