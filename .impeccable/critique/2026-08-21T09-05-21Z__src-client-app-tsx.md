---
target: full Misfits UI
total_score: 24
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 2
timestamp: 2026-08-21T09-05-21Z
slug: src-client-app-tsx
---
# Misfits 501 Impeccable UI Review — 21 August 2026

⚠️ DEGRADED: single-context (spawn_agent unavailable in this session)

## Design health

| # | Heuristic | Score | Key issue |
| --- | --- | --- | --- |
| 1 | Visibility of system status | 3/4 | Loading, success and error states exist; public loading is visually silent. |
| 2 | Match system / real world | 3/4 | Club language is improving, but `league` wording and generic dashboard patterns remain. |
| 3 | User control and freedom | 3/4 | Task switching and dispute cancellation are clear; destructive actions still use browser confirmation. |
| 4 | Consistency and standards | 2/4 | Strong landing world gives way to a visually unrelated table/admin system. |
| 5 | Error prevention | 2/4 | Numeric constraints exist, but dense admin forms and destructive controls need stronger safeguards. |
| 6 | Recognition rather than recall | 3/4 | Labels are explicit and navigation is visible. |
| 7 | Flexibility and efficiency | 2/4 | Admin task grouping helps, but desktop does not yet exploit space for fast operation. |
| 8 | Aesthetic and minimalist design | 2/4 | Hero is disciplined; repeated pills, strips and generic typography dilute it below the fold. |
| 9 | Error recovery | 2/4 | Errors are announced but rarely offer a direct retry or recovery action. |
| 10 | Help and documentation | 2/4 | Short guidance exists, but onboarding and empty states do not explain the club flow well enough. |
| **Total** |  | **24/40** | **Promising identity; incomplete system.** |

## Design-specificity verdict

The landing page is now recognisably Misfits: black ground, warm cream, restrained red and the excellent “Club darts, properly settled.” promise. The rest is still category-interchangeable. Replace the name and logo and the public table, tabs, status pills, admin forms and profile panel could belong to almost any small league product.

The gap is not “more decoration.” The gap is one authored visual system connecting the entrance, table, member workspace and club control room. The supplied Misfits artwork is reduced to a small header mark exactly where it could establish ownership and atmosphere.

The deterministic scan found two verified signs of generic AI-generated UI in `src/client/styles.css`: Inter as the global face (line 1) and a thick red side accent on the invite box (line 201). Neither is a false positive in this product context.

## What is working

- The landing phrase, palette and generous first viewport finally create a point of view.
- Core interaction design is unusually solid for this stage: explicit labels, visible focus, 44–48px primary controls, status feedback and a correctly managed dispute dialog.
- The interface is restrained. It avoids gradients-as-brand, nested card walls and decorative feature blocks.

## Priority issues

### P1 — The club world ends at the hero

**Location:** `src/client/App.tsx` signed-out public home and `src/client/styles.css` lines 116–203.

**Impact:** The emotional promise is followed by a standard cream dashboard. This directly explains the user's “looks like every other website” reaction and prevents the site feeling like one private club.

**Recommendation:** Design the public table as the club's fixture board/ledger: stronger Misfits ownership, editorial table hierarchy, fewer pills, less generic card language and one consistent typographic voice. Preserve the clean data density.

**Suggested command:** `$impeccable shape` followed by `$impeccable bolder`.

### P1 — Desktop remains a widened mobile page

**Location:** `src/client/styles.css` lines 63–81 and 205–215.

**Impact:** The only desktop breakpoint mainly removes padding and adds one admin grid. Public tables and member views do not gain a deliberate desktop composition, despite desktop being a first-class product requirement.

**Recommendation:** Establish content rails and desktop compositions for three surfaces: public club table, player workspace and control room. Keep mobile single-column; use desktop space for table readability, season context and task navigation rather than stretching rows.

**Suggested command:** `$impeccable adapt` and `$impeccable layout`.

### P2 — Typography has no club character

**Location:** `src/client/styles.css` line 1.

**Impact:** Inter makes the strongest copy feel like a startup template and removes the cultural link between the rough Misfits badge and the pristine interface.

**Recommendation:** Define a two-face system: a distinctive display face for club headlines and a highly legible workhorse for tables/forms. Self-host only small WOFF2 subsets or use a carefully chosen system fallback so Cloudflare-free performance remains intact.

**Suggested command:** `$impeccable typeset`.

### P2 — The CSS is a stack of overrides, not a design system

**Location:** `src/client/styles.css` throughout; 112 literal color uses and repeated redefinitions of headings, surfaces and controls.

**Impact:** Small changes can produce unintended contrast or hierarchy drift. The signed-out and signed-in experiences already feel like separate themes because values are repeated rather than named.

**Recommendation:** Extract a compact token layer for ink, paper, red, muted text, rules, spacing, radii and type. Do not add a framework or component library.

**Suggested command:** `$impeccable extract` then `$impeccable colorize`.

### P2 — Mobile navigation and secondary controls are under the intended touch floor

**Location:** `src/client/styles.css` lines 108, 126, 131, 152 and 200–203.

**Impact:** Header sign-out is 36px; content tabs are 42px; several action buttons are 40px. Around a dartboard, these are less forgiving than the otherwise mobile-first UI.

**Recommendation:** Raise every interactive target to at least 44px without making the interface visually bulky; use padding and hit-area techniques.

**Suggested command:** `$impeccable audit` and `$impeccable adapt`.

## Persona red flags

**Club member at the board:** The main player navigation is understandable, but five horizontally scrolling choices and 40–42px controls demand precision in a noisy, one-handed setting. “Add result” should read as the dominant next action when a season is open.

**First-time invited player:** “Members' door” has personality, but the public-to-Google-to-invite journey is not explained at the decision point. If the invite was not preserved or fails, the recovery copy does not tell them what to do next.

**Club administrator on desktop:** Task grouping is a major improvement, but the control room still behaves like forms stacked in a document. The desktop view does not provide a stable season context, a clear current task or quick scanning across pending work.

## Technical audit

| Dimension | Score | Key finding |
| --- | --- | --- |
| Accessibility | 3/4 | Good semantics and focus work; several targets are below 44px and recovery actions are weak. |
| Performance | 3/4 | Lean dependency surface and 71KB gzipped JS; 260KB brand JPEG is acceptable but should not multiply across views. |
| Responsive design | 2/4 | Mobile-first implementation works; desktop composition is incomplete and scroll tabs have weak affordance. |
| Theming | 1/4 | Nearly all color decisions are literal values; no coherent token layer. |
| Implementation integrity | 2/4 | Two detector findings, repeated overrides and a visual split between hero and product UI. |
| **Total** | **11/20** | **Acceptable foundation; significant design-system work remains.** |

## Minor observations

- `Share league` conflicts with the newer season language.
- The signed-out header hides the club name and strapline, leaving only a small badge.
- The stale desktop selector `.admin-desk > [role="tabpanel"]` no longer describes the task switcher's semantics consistently.
- Horizontal tab rows need a visible continuation cue when content overflows.
- Empty states are accurate but emotionally flat; one club-specific sentence would help more than illustration or extra cards.

## Recommended sequence

1. `$impeccable init` — capture `PRODUCT.md` and `DESIGN.md` under the existing vision/spec authority.
2. `$impeccable shape` — define one club system across landing, table, player and admin surfaces.
3. `$impeccable typeset` and `$impeccable extract` — establish type and minimal tokens.
4. `$impeccable adapt` — make desktop first-class and raise mobile touch targets.
5. `$impeccable bolder` — give the table and workspace unmistakable Misfits ownership without adding clutter.
6. `$impeccable polish` — final consistency and release pass.
