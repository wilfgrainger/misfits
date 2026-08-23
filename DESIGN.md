# Misfits 501 Design System

## Visual authority

Misfits 501 is a private darts club app: dark, precise, premium and unmistakably club-owned.

The standing implementation authorities are:

- `docs/superpowers/specs/2026-08-22-private-club-entry-design.md` for private admission and member navigation;
- `docs/superpowers/specs/2026-08-22-mobile-experience-reset-design.md` for responsive composition, hierarchy and table treatment;
- this document for durable visual and interaction rules.

Implementation may adapt those references for real data, accessibility and responsive constraints, but must not drift back into a generic responsive website or public league portal.

The league table is the product's shared truth after membership approval. Before approval, privacy is the product truth and no club data is rendered.

## Visual world

The interface is full dark: near-black and charcoal surfaces, warm cream text, Misfits red for normal interaction and restrained green only for positive semantic state.

The intended feel is **mobile product, not generic website**:

- confident hierarchy;
- meaningful rounded cards;
- calm spacing;
- strong iconography;
- subtle depth rather than bright SaaS tiles;
- club-specific imagery used with restraint;
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
- selected navigation;
- active tabs;
- focus-visible outlines;
- ordinary action icons;
- private-entry emphasis;
- current-player/rank accents where a brand accent is needed.

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
- Avoid tiny uppercase labels where sentence case is clearer; compact table labels may remain uppercase.

## Private entry states

Anonymous visitors see a privacy-safe Misfits shell only. They must not see league, season, standings, results, player or member data, including during loading.

### Signed out

The signed-out state contains:

1. club identity;
2. `Private members club` context;
3. `Welcome to Misfits`, or invitation-specific copy when `/join/:token` is present;
4. Google sign-in;
5. a short privacy statement.

Authentication is intentionally important here because no club record is public.

### Invited new member

A valid `/join/:token` carries the invite only into Google admission. After successful admission the raw token is removed from session storage and the URL, and the person enters PENDING state.

### Pending

Pending members see only:

- membership request received;
- waiting-for-admin explanation;
- privacy statement;
- Sign out.

No member navigation or club data is mounted.

### Rejected

Rejected members see only the not-approved state, a direct contact-admin instruction and Sign out. A later invite does not reset rejected membership.

### Approved onboarding

Approved members without a nickname see nickname setup before club data is loaded. Nickname creation does not perform league self-enrolment.

## Approved member hierarchy

```text
Club header
→ League selector when multiple leagues exist
→ League hero
→ Rules
→ Current view content
→ Fixed member navigation
```

Approved but unassigned club members may browse club leagues, standings, results and players. They receive a clear browse-only Record state because season/league placement remains the participation authority.

## Navigation

The primary signed-in member navigation is exactly:

`League · Record · Results · More`

This is fixed regardless of whether persisted fixtures exist.

### League

Owns standings and current competition context.

### Record

Owns the entire result-entry journey. If fixtures exist, outstanding fixture selection happens inside Record. `Fixtures` is never a fifth primary member tab.

Unassigned approved members see the browse-only explanation instead of result controls.

### Results

Owns confirmed and member-pending game history.

### More

Contains exactly the secondary member destinations appropriate to the current user:

- Players;
- Profile;
- Admin, for admins only;
- Sign out.

Removed primary destinations must not reappear as duplicate shortcuts elsewhere.

If no league has yet been published, the same four-item member navigation remains available. League, Record and Results show intentional empty states; More still provides Profile, Sign out and Admin for administrators. This ensures an approved administrator can create the first league without a hidden bootstrap route.

## Admin workspace

Admin is entered through `More → Admin`, not through a competing top-level `Season admin / Club table` switcher.

The admin task rail is:

`Season · Leagues · Season members · Fixtures · Results · Promotion · Club access`

`Club access` owns permanent admission and club-wide invitations. Pending requests are visually prioritised before approved/rejected lists and invite administration.

`Season members` owns season/league placement only. It does not create admission invitations.

Admin league selection is independent of the member workspace selection. Returning from Admin restores the member's previously selected league.

## League hero and rules

One hero owns current competition identity: league name, season, state and a small amount of truthful metadata. Do not repeat league/season headings immediately below it.

Rules live in a dedicated compact surface, for example:

`Best of 6 · Win 3 · Draw 1 · Loss 0`

`Table: Points → Legs won → Head-to-head`

Rules must remain readable and secondary, never washed-out filler.

## Standings

Standings are the primary information card.

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
- safe-area-aware fixed member navigation;
- bottom navigation never overlays content;
- cards reflow rather than shrink indiscriminately;
- Google sign-in never exceeds the usable viewport.

### Tablet

- preserve the mobile hierarchy;
- allow cards/table details to widen intentionally;
- use whitespace to separate product units rather than inserting duplicate headings.

### Desktop

- the same product hierarchy expands rather than transforming into unrelated SaaS dashboard chrome;
- complete standings information can be visible;
- admin task navigation may widen where it materially improves scanning;
- content uses width intentionally rather than merely stretching the phone layout.

## Interaction and accessibility

- 44px minimum touch targets for member actions.
- Visible `:focus-visible` treatment using Misfits red for normal navigation/actions.
- Buttons and icon-only actions have accessible names.
- Semantic heading hierarchy and landmarks.
- WCAG-conscious contrast for all body/rule/status text.
- Destructive actions remain explicit and protected.
- Motion is restrained; `prefers-reduced-motion` is respected.
- Decorative imagery never carries essential meaning.
- Modal dispute flow retains Escape close, focus entry and keyboard focus containment.

## Loading, empty and error states

Every data-bearing member/admin surface must have deliberate loading, empty and failure behaviour. No state should expose anonymous club data as a loading shortcut.

Important empty states include:

- approved club member before any league is published;
- approved but unassigned member in Record;
- no outstanding fixtures;
- no table movement/results;
- no pending membership requests;
- no club invites.

Retry actions remain contextual and do not create duplicate navigation.

## Card rules

Cards are encouraged when they represent real product units:

- private entry/admission state;
- current league;
- rules;
- standings;
- record/results workflow;
- club-access admission workflow.

Cards are rejected when they are generic KPI tiles, duplicate information already visible elsewhere, or decorative containers with no task/information boundary.

## Anti-patterns

- No anonymous league or player data.
- No legacy self-service league invite/join UI.
- No `Season admin / Club table` top-level switcher.
- No `Fixtures` primary member tab.
- No direct `Players` primary member tab.
- No green active navigation or ordinary green CTA.
- No horizontal page overflow at supported mobile widths.
- No squeezed seven-column desktop table on a phone.
- No oversized Google sign-in hero.
- No repeated `Misfits 501 / 2026` heading stack.
- No large unexplained dead vertical gaps.
- No low-contrast rules/body copy.
- No generic SaaS metric-card dashboard.
- No pill overload.
- No parchment/beige ledger aesthetic.
- No artwork behind copy when it reduces readability.
- No default browser-looking form furniture.
- No external font dependency for visual polish.

## UI acceptance

Material responsive releases are accepted against both behaviour and rendered product evidence.

Required release evidence:

- privacy/no-data-flash tests;
- member navigation and participation-aware Record tests;
- overflow/touch-target/static responsive audit at required widths;
- repo-local Impeccable detector/review;
- Cave Pony simplicity review;
- one clean full repository gate before production migration and merge.

Automated tests can prove privacy, interaction contracts and structural accessibility. Where an interactive browser is unavailable, do not claim manual pixel-perfect screenshot acceptance; record the limitation explicitly and preserve the CSS/static checks for the next rendered review.
