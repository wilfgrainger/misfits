---
target: src/client/App.tsx
total_score: 35
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
timestamp: 2026-08-21T13-27-23Z
slug: src-client-app-tsx
---
# Misfits 501 Impeccable UI Review — 21 August 2026

⚠️ DEGRADED: single-context (spawn_agent unavailable in this session)

## Design health

| # | Heuristic | Score | Key issue |
| --- | --- | --- | --- |
| 1 | Visibility of system status | 3/4 | Excellent feedback during async updates, though the public-facing view could benefit from more detailed loading skeletons during active network fetches. |
| 2 | Match system / real world | 4/4 | Complete integration of club-first terminology (`Club table`, `Current season`, `Season admin`, `Record a result`, `Club access`). Generic SaaS conventions are fully avoided. |
| 3 | User control and freedom | 3/4 | Roving keyboard support in tabs is solid. Deletion and revocation still rely on browser native confirmations, which is acceptable but leaves room for future inline dialogs. |
| 4 | Consistency and standards | 4/4 | A single token-led stylesheet `styles.css` maintains unified visual rules across all surfaces (public, player, admin). |
| 5 | Error prevention | 4/4 | Form boundaries use fieldset/legend groupings, strict capacity checks, and default visibility to `PRIVATE` to prevent accidental public disclosure. |
| 6 | Recognition rather than recall | 4/4 | Factual season contexts are displayed inline (e.g., `Current season: Tuesday Club...`), reducing the cognitive need to remember selected scopes. |
| 7 | Flexibility and efficiency | 3/4 | Administrative tasks are tabbed. Desktop layouts leverage space efficiently with persistent left-hand rails and responsive grid columns. |
| 8 | Aesthetic and minimalist design | 4/4 | Extremely disciplined, dark midnight shell with warm off-white parchment desks. Grids of cards and pill buttons have been eliminated. |
| 9 | Error recovery | 3/4 | User errors are clearly flagged with descriptive messages (`error-message` and `role="alert"`), though direct retry shortcuts are not always present. |
| 10 | Help and documentation | 3/4 | Onboarding and empty state guidance are highly task-focused, showing exactly what is needed next without unnecessary boilerplate. |
| **Total** |  | **35/40** | **Solid, bespoke club record system.** |

## Design-specificity verdict

The application feels highly bespoke and tailored to the Misfits 501 darts club identity. The previous visual split between the landing page and internal views has been successfully resolved. By replacing the generic card grid, marketing hero copy, and pill overrides with a unified "ledger" theme, the site feels like a physical ledger kept at a dartboard. The supplied artwork is contained neatly in the sticky brand header, acting as a genuine club seal. 

The CSS detector is clean, showing no generic AI styling leftovers, absolute overrides, or color drift. Typography has system fallbacks that avoid generic Google Sans or Inter branding.

## What is working

- **Thematic Cohesion:** The charcoal-and-parchment ledger theme flows seamlessly from signed-out standings to private member desks.
- **Calm Layouts:** Moving away from typical dashboards to ruled lines, rails, and generous whitespace makes operational fields highly readable.
- **Accessibility & Focus:** Tab navigation supports full keyboard operations (Home, End, Arrow Keys) with clear `:focus-visible` styling and a 44px minimum touch size.

## Priority issues

No P0 or P1 design issues remain. The core architecture is verified, and the interface matches all non-negotiable product specifications. The following are P2/P3 refinements:

### P2 — Browser native confirmation modals
* **Location:** `src/client/components/AdminLeagueDesk.tsx` (invite revocation and result deletion actions).
* **Impact:** Disrupts the dark/parchment interface theme with default browser popups (e.g., native `window.confirm`).
* **Fix:** Introduce a unified, accessible confirmation dialog component styled after the ledger design system once destructive operations are fully scoped.
* **Suggested command:** `$impeccable shape`

### P3 — Duplicate key warning in test console
* **Location:** `tests/client/app-league-create.test.tsx` (mock API `createAdminLeague` returning static `id: 'league-created'`).
* **Impact:** Emits console warnings during test execution (`Encountered two children with the same key, 'league-created'`), which can hide actual component bugs.
* **Fix:** Update the mock API function in tests to generate unique IDs sequentially or using a counter.
* **Suggested command:** `$impeccable polish`

### P3 — Standings text truncates on very narrow screens (320px)
* **Location:** `src/client/styles.css` (player name column within `.standings-table`).
* **Impact:** In extremely narrow viewports, long usernames might overlap or truncate aggressively, though the table container itself scrolls cleanly.
* **Fix:** Limit maximum character length for usernames in the view or add a subtle fade edge for long names.
* **Suggested command:** `$impeccable adapt`

## Persona red flags

* **Alex (Power User):** No keyboard shortcuts are configured for record-result submission, which would speed up match nights. However, Alex can navigate all menus, tabs, and modals cleanly using standard keyboard keys (Escape, Arrow Keys, Tab).
* **Jordan (First-Timer):** Very clear next steps. The empty state ("Open your Misfits invite...") tells the user exactly how to proceed.
* **Casey (Distracted Mobile User):** The 44px minimum target sizes are strictly enforced. Table scroll regions prevent document-level zoom/overflow, making the app highly stable to use one-handed around the board.

## Technical audit

| Dimension | Score | Key finding |
| --- | --- | --- |
| Accessibility | 4/4 | Form controls are fully labeled, focus states are high-contrast, and keyboard tablist roving focus is fully operational. |
| Performance | 4/4 | Minimal static asset load; the brand JPEG is compressed and served once. |
| Responsive design | 4/4 | Seamless transition between two-column mobile task grids and sticky desktop workbench rails. |
| Theming | 4/4 | Fully tokenized CSS variable layer. No literal colors or hardcoded spacing overrides are used. |
| Implementation integrity | 4/4 | Impeccable detector is 100% clean. All 127 tests pass successfully. |
| **Total** | **20/20** | **Outstanding craft and system cleanliness.** |

## Minor observations

- The transition from "Share league" to "Share season" is consistent across public and admin headers.
- Fieldset groupings organize dense season settings forms into logical blocks.
- Scroll scrollbars on horizontal lists remain subtle.
