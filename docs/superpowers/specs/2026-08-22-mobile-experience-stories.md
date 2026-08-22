# Misfits 501 Mobile Experience Stories

**Status:** APPROVED experience acceptance layer  
**Date:** 22 August 2026  
**Purpose:** Convert the approved Mobile Experience Reset mockup into durable user-facing acceptance criteria without changing the canonical 150 functional-story count.

These `MX-*` stories complement the functional catalogue. They do not independently alter the `117/150 verified, 33 parked` accounting. Where an MX story depends on a parked functional capability, the visual shell may be designed now but the capability remains parked until its functional story is implemented and revalidated.

| ID | User story | Acceptance criteria | Functional relationship |
|---|---|---|---|
| **MX-001** | As a visitor, I want to recognise Misfits immediately so the page feels like my darts club rather than generic league software. | Supplied club artwork/name is prominent; dark Misfits visual world is unmistakable; subtle darts imagery may support atmosphere; no generic SaaS hero or white-label language. | Reinforces public club identity and `PUB-001`/`PUB-002` presentation. |
| **MX-002** | As a visitor, I want the current league and season obvious immediately so I know what competition I am viewing. | One canonical hero owns league name, season and status; the same identity is not repeated in adjacent headings; useful metadata remains compact. | Reinforces current-season/league context including `PLY-012` and public league context. |
| **MX-003** | As a visitor, I want the standings to appear before secondary account actions so I can see the club table quickly. | Standings begins in the first normal phone viewport where content length permits; sign-in never dominates the first screen; no large dead vertical gap separates introduction from league content. | Reinforces public standings stories and existing verified `PLY-020`. |
| **MX-004** | As a phone user, I want standings designed for my screen so I can read them without horizontal page scrolling or microscopic columns. | At 320–412px primary row shows POS, PLAYER, P, W-D-L and PTS; LEGS/AVG become secondary or progressively exposed; points remain scan-first; no page-level horizontal overflow. | Reinforces `PLY-020`, `ADM-087`, `ADM-088` responsive acceptance. |
| **MX-005** | As a visitor, I want the competition rules summarised clearly so I understand how the table works without reading prose. | Dedicated rules surface shows Best-of, win/draw/loss points and tie-break order with accessible contrast; it is visually secondary to standings but never faint filler text. | Reinforces `PLY-016` and public rule visibility. |
| **MX-006** | As a visitor, I want signing in to be available without overwhelming the league so I authenticate only when I need to act. | Compact sign-in action follows primary league information; Google remains the only authentication method; action explains the benefit such as recording or confirming results. | Reinforces existing Google-auth stories and player result flow. |
| **MX-007** | As a visitor, I want recent confirmed results below the table so I can understand what has happened recently. | Latest-results surface handles data, genuine empty and failure-with-retry states distinctly; failure never silently disappears. | Reinforces `PUB-003`, `PUB-004`, `PUB-007` and public failure handling. |
| **MX-008** | As a mobile user, I want app-like navigation that reflects what I can actually use so navigation is predictable. | Target member IA is League · Fixtures · Results · More; unavailable capability is hidden/disabled rather than linked to an inaccessible route; navigation respects safe areas and never covers content. | Depends on `PLY-026`–`PLY-040` for full member Fixtures capability. |
| **MX-009** | As a signed-in player, I want the member experience to retain the same league-first visual language so signing in does not drop me into a different product. | Public and member shells share brand header, league hero, spacing, cards, green-led active state and bottom-nav principles; account identity does not become a second hero. | Reinforces player workspace and current UX compression work. |
| **MX-010** | As a user on a small phone, I want every screen to fit cleanly so nothing is clipped or accidentally off-screen. | Screenshot acceptance at 320/375/390/412px; zero page overflow; 16–20px usable gutters; 44px minimum targets; no clipped copy; no bottom-nav overlap. | Reinforces `ADM-087` responsive acceptance and global accessibility. |
| **MX-011** | As a tablet or desktop user, I want the same hierarchy with more room rather than a stretched phone layout. | At 768/960px+ cards reflow intentionally, complete table information may reappear, whitespace becomes useful structure and the mobile hierarchy remains recognisable. | Reinforces `ADM-088` desktop acceptance. |
| **MX-012** | As the club owner, I want UI releases judged by the rendered experience so automated checks cannot hide a visibly broken product. | Material responsive releases include screenshot evidence at agreed mobile/tablet/desktop widths plus automated regression checks and Impeccable review; visibly broken composition fails acceptance even when tests are green. | Experience-level acceptance rule; does not alter functional story status by itself. |

## Truthfulness rules

- Do not show motivational claims that are technically true but contextually silly. Example: a sole player at 0–0 must not receive a celebratory `Top of the table` treatment.
- Do not show `Fixtures` as actionable until the current user has a permission-safe route to use it.
- Do not manufacture player counts, season progress or competition metadata when the underlying data is unavailable.
- Decorative visual elements never become the only carrier of meaning.

## Release boundary

The Mobile Experience Reset may implement every visual/interaction acceptance above that can be satisfied using current APIs and data. It must not silently implement, emulate or close the parked fixture-first functional stories. Those remain the following product release unless explicitly reprioritised.
