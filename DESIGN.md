# Misfits 501 Design System

## Visual authority

Misfits 501 is one private darts club app: dark, precise, premium and unmistakably club-owned.

The standing implementation authorities are:

1. `docs/superpowers/specs/2026-08-23-club-first-navigation-design.md` for the signed-in information architecture;
2. `docs/superpowers/specs/2026-08-22-private-club-entry-design.md` for admission and privacy;
3. `docs/superpowers/specs/2026-08-22-mobile-experience-reset-design.md` for responsive composition and table treatment;
4. this document for durable visual and interaction rules.

Implementation may adapt those references for real data, accessibility and responsive constraints, but must not drift back into a generic responsive website, public league portal or league-framed application.

**Club first. Competition second. Task first.** A league is content inside Misfits, never the frame of the whole product.

## Visual world

The interface is full dark: near-black and charcoal surfaces, warm cream text, Misfits red for normal interaction and restrained green only for positive semantic state.

The intended feel is **mobile product, not generic website**:

- confident hierarchy;
- calm spacing;
- meaningful surfaces only around real product units;
- strong, restrained iconography;
- subtle depth rather than bright SaaS tiles;
- club-specific identity used with restraint;
- no white-label dashboard aesthetic.

## Palette

| Token | Value | Role |
|---|---|---|
| `--club-ink` | `#090d0c` | App background / dark chrome |
| `--club-card` | `#111715` | Primary cards |
| `--club-card-raised` | `#17201c` | Elevated surfaces |
| `--club-border` | `#2a3630` | Hairlines and card outlines |
| `--club-text` | `#f3f5ef` | Primary warm text |
| `--club-muted` | `#aab6ae` | Secondary text |
| `--club-dim` | `#7e8b83` | Muted labels/placeholders only |
| `--club-red` | `#d44040` | Primary club interaction accent |
| `--club-red-strong` | `#e35454` | Focus, selected text and stronger interaction |
| `--club-red-soft` | `rgba(212,64,64,.14)` | Tonal selected/brand surface |
| `--club-success` | `#63c978` | OPEN, confirmed and positive state only |
| `--danger` | `#c84a4a` | Errors/destructive/disputed state |

### Colour contract

Misfits red owns ordinary interaction:

- primary buttons;
- selected global navigation;
- active competition tabs;
- focus-visible outlines;
- ordinary action icons;
- private-entry emphasis.

Green is semantic only:

- OPEN;
- confirmed;
- success;
- winner/positive result state.

Do not use green simply to make an element look active. Destructive actions may also use red, but must remain distinguishable by explicit wording, iconography and context rather than colour alone.

The supplied Misfits artwork is never recoloured.

## Type

- System sans-serif stack: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- No external font dependency is required.
- Strong hierarchy comes from scale, weight, spacing and contrast.
- Numeric competition data uses `font-variant-numeric: tabular-nums`.
- Points remain the strongest standings number.
- Avoid giant marketing typography inside the signed-in product.
- Avoid tiny uppercase labels where sentence case is clearer; short section kickers may use compact uppercase treatment.

## Private entry states

Anonymous visitors see a privacy-safe Misfits shell only. They must not see league, season, standings, results, player or member data, including during loading.

### Signed out

The signed-out state contains:

1. club identity;
2. `Private members club` context;
3. `Welcome to Misfits`, or invitation-specific copy when `/join/:token` is present;
4. Google sign-in;
5. a short privacy statement.

### Invited new member

A valid `/join/:token` carries the invite only into Google admission. After successful admission the raw token is removed from session storage and the URL, and the person enters PENDING state.

### Pending

Pending members see only membership-request status, waiting-for-admin explanation, privacy statement and Sign out. No member navigation or club data is mounted.

### Rejected

Rejected members see only the not-approved state, a direct contact-admin instruction and Sign out. A later invite does not reset rejected membership.

### Approved onboarding

Approved members without a nickname see nickname setup before club data is loaded. Nickname creation does not perform league self-enrolment.

## Approved member hierarchy

```text
Compact club header
→ Global club navigation
→ Current club task or destination
→ Competition workspace only when a competition is opened
```

The compact header carries club identity and the member avatar. The avatar is an explicit Profile shortcut.

There is no permanent “workspace ready” success strip after authentication. Successful admission is the normal state, not a recurring notification.

Approved but unassigned club members may browse club leagues, standings, fixtures, results and players. Season/league placement remains the authority for result entry.

## Global member navigation

The primary signed-in navigation is exactly:

`Home · Record · Leagues · More`

It is club-wide and stable regardless of the number of leagues or whether persisted fixtures exist.

On narrow phones it is safe-area-aware fixed bottom navigation. On wider screens the same four destinations remain visible as restrained product navigation rather than turning into unrelated dashboard chrome.

### Home

Home is the default signed-in destination.

It contains:

- a compact personal greeting;
- `Your competitions` for the leagues the member is actually assigned to;
- `Needs you` for useful attention/task entry points.

Home must not mount a giant league hero, rules card or full table just because one league exists.

When the member has no competition assignment, Home explains that their club membership is active and that competitions will appear when assigned.

### Record

Record owns the result-entry journey across the member's eligible open competitions.

- zero eligible competitions: intentional contextual empty state;
- exactly one eligible competition: enter that competition's Record flow directly;
- more than one eligible competition: ask `What are you recording?` before entering the result flow.

If persisted fixtures exist, outstanding fixture selection remains inside Record. `Fixtures` is never a fifth global member destination.

Existing result submission, confirmation and dispute integrity remains authoritative. The navigation redesign must not duplicate or replace proven scoring logic.

### Leagues

Leagues is the club competition browser. It may show every competition the approved member is allowed to browse, regardless of whether they participate in it.

Opening a competition creates a **local competition workspace** with exactly:

`Table · Fixtures · Results`

These are local tabs, not global navigation.

A selected competition uses a compact heading with name, season context and refresh. Do not resurrect the old oversized league hero or repeat the league/season identity immediately below it.

### More

More deliberately contains secondary club/account tasks:

- Players;
- Profile;
- Admin, for admins only;
- Sign out.

Approved administrators with no leagues must still be able to reach `More → Admin` and create the first competition.

Removed global destinations must not reappear as duplicate shortcuts elsewhere.

## Competition workspace

Competition data is dense, useful content, not a marketing hero.

The workspace should feel compact and settled:

- competition name and season in a modest heading;
- local `Table · Fixtures · Results` tabs;
- one active data/workflow surface below;
- no duplicated global navigation;
- no decorative rules wall above the data.

Scoring/rule context appears where it materially helps a result-entry or admin task. It does not need to occupy a permanent hero-sized surface.

## Admin workspace

Admin is entered through `More → Admin`, not through a competing top-level `Season admin / Club table` switcher.

The admin task rail remains:

`Season · Leagues · Season members · Fixtures · Results · Promotion · Club access`

`Club access` owns permanent admission and club-wide invitations. Pending requests are visually prioritised before approved/rejected lists and invite administration.

`Season members` owns season/league placement only. It does not create admission invitations.

Admin competition selection is independent from member competition browsing. Returning from Admin returns to the club member experience rather than making an admin-selected league the global app frame.

## Standings

Standings are the competition's shared table truth, but they live inside `Leagues → Table` rather than defining the whole signed-in application.

On narrow phones, show the primary mobile contract:

`POS | PLAYER | P | W-D-L | PTS`

`LEGS` and `AVG` are progressive/secondary information and must not force a squeezed seven-column phone table.

At wider widths, expose the complete standings set intentionally.

A contextual rank/encouragement panel is optional and must be truthful. Do not celebrate a meaningless one-player 0–0 table.

## Responsive rules

### Required acceptance widths

- 320px
- 360px
- 375px
- 390px
- 412px
- 430px
- 768px
- desktop at 1024px+

### Mobile

- single product column;
- 16–20px usable page gutters;
- zero page-level horizontal overflow;
- no clipped headings/copy;
- 44px minimum interactive targets;
- safe-area-aware fixed global member navigation;
- bottom navigation never overlays content;
- competition rows reflow rather than shrink indiscriminately;
- Google sign-in never exceeds the usable viewport.

### Tablet

- preserve the club-first hierarchy;
- allow competition/data details to widen intentionally;
- use whitespace to separate product units rather than inserting duplicate headings.

### Desktop

- preserve the same four global destinations;
- Home may use a deliberate two-column composition for competitions and attention;
- competition browser may use multiple columns;
- complete standings information can be visible;
- admin task navigation may widen where it materially improves scanning;
- content uses width intentionally rather than merely stretching the phone layout.

## Interaction and accessibility

- 44px minimum touch targets for member actions.
- Visible `:focus-visible` treatment using Misfits red for normal navigation/actions.
- Buttons and icon-only actions have accessible names.
- The header avatar is a button named `Open profile` for assistive technology.
- Local competition tabs use tab semantics.
- Semantic heading hierarchy and landmarks.
- WCAG-conscious contrast for all body/rule/status text.
- Destructive actions remain explicit and protected.
- Motion is restrained; `prefers-reduced-motion` is respected.
- Decorative imagery never carries essential meaning.
- Modal dispute flow retains Escape close, focus entry and keyboard focus containment.

## Loading, empty and error states

Every data-bearing member/admin surface must have deliberate loading, empty and failure behaviour. No state may expose anonymous club data as a loading shortcut.

Important empty states include:

- approved club member before any league is published;
- approved but unassigned member on Home and Record;
- no outstanding fixtures;
- no table movement/results;
- no pending membership requests;
- no club invites.

Retry actions remain contextual and do not create duplicate navigation.

## Surface rules

Use a bordered/raised surface when it represents a real product unit, for example:

- private entry/admission;
- `Your competitions`;
- `Needs you`;
- result entry/review;
- standings;
- competition fixtures/results;
- club-access admission workflow.

Do not wrap every heading, row and control in another card. Nested container soup is not premium.

## Anti-patterns

- No anonymous league or player data.
- No legacy self-service league invite/join UI.
- No `Season admin / Club table` top-level switcher.
- No `League · Record · Results · More` global navigation.
- No `Fixtures` global member tab.
- No direct `Players` global member tab.
- No giant league hero on Home or around the competition workspace.
- No permanent post-login success strip.
- No green active navigation or ordinary green CTA.
- No horizontal page overflow at supported mobile widths.
- No squeezed seven-column desktop table on a phone.
- No oversized Google sign-in hero.
- No repeated `Misfits 501 / 2026` heading stack.
- No large unexplained dead vertical gaps.
- No low-contrast rules/body copy.
- No generic SaaS metric-card dashboard.
- No pill overload.
- No excessive nested cards.
- No parchment/beige ledger aesthetic.
- No artwork behind copy when it reduces readability.
- No default browser-looking form furniture.
- No external font dependency for visual polish.

## UI acceptance

Material responsive releases are accepted against behaviour and rendered product evidence.

Required release evidence:

- privacy/no-data-flash tests;
- club-first member navigation tests;
- task-first Record and participation tests;
- competition-local tab tests;
- profile shortcut test;
- overflow/touch-target/static responsive audit at required widths;
- repo-local Impeccable detector/review;
- Cave Pony simplicity review;
- one clean full repository gate before merge;
- post-merge production deploy verification.

Automated tests can prove privacy, interaction contracts and structural accessibility. Where an interactive browser is unavailable, do not claim manual pixel-perfect screenshot acceptance. Record the limitation explicitly and preserve the CSS/static checks for the next rendered review.
