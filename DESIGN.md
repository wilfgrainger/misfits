# Misfits 501 Design System

## Visual authority

Misfits 501 is a private darts club app: dark, precise, premium and unmistakably club-owned.

The approved **Mobile Experience Reset** mockup from 22 August 2026 is the standing visual target for public/player hierarchy, composition, card rhythm, navigation and quality. The durable implementation contract is `docs/superpowers/specs/2026-08-22-mobile-experience-reset-design.md`.

Implementation may adapt the mockup for real data, accessibility and responsive constraints, but must not reinterpret it back into the previous stacked responsive-website composition.

The league table is the product's shared truth. Club identity, current competition, standings and results take visual priority over authentication and account chrome.

## Visual world

The interface is full dark: near-black and charcoal surfaces, warm cream text, restrained emerald accents and subtle authored darts details.

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
| `--bg` | `#0b0f0e` | App background / dark chrome |
| `--surface` | `#111715` | Primary cards |
| `--surface-2` | `#18201d` | Elevated/interactive surfaces |
| `--surface-3` | `#202a26` | Active rows / stronger depth |
| `--border` | `#28342f` | Hairlines and card outlines |
| `--border-mid` | `#35443d` | Stronger interactive outlines |
| `--text` | `#f1eee6` | Primary warm text |
| `--text-2` | `#b1b7b2` | Secondary text |
| `--text-3` | `#747d77` | Muted labels/placeholders only |
| `--green` | `#63c978` | Primary active/club accent |
| `--green-deep` | `#173321` | Green tonal card depth |
| `--gold` | `#c4a96c` | Meaningful rank/season distinction |
| `--red` | `#d44040` | Exceptional/destructive/disputed emphasis |
| `--success` | `#58b875` | Confirmed/open/positive state |
| `--danger` | `#c84a4a` | Errors/destructive/disputed state |

Normal navigation and selected state are **green-led**, not red-led. Red is reserved for danger, dispute, destructive actions and exceptional emphasis.

## Type

- System sans-serif stack: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- No external font dependency is required.
- Strong hierarchy comes from scale, weight, spacing and contrast.
- Numeric competition data uses `font-variant-numeric: tabular-nums`.
- Points remain the strongest standings number.
- Avoid tiny uppercase labels where sentence case is clearer; compact table labels may remain uppercase.

## Product hierarchy

### Public/mobile default

```text
Club header
→ League hero
→ Rules strip
→ Standings
→ Sign-in/member action
→ Latest results
→ Bottom navigation
```

Authentication must never dominate the league record.

### Club header

- Supplied Misfits artwork anchors identity and is never destructively cropped/recoloured.
- Brand name and a short club voice line may accompany it where space permits.
- Share is compact secondary chrome.
- Subtle dartboard/dart imagery may be used as atmospheric decoration if text contrast is untouched.

### League hero

One hero owns current competition identity: league name, season, state and a small amount of truthful metadata. Do not repeat league/season headings immediately below it.

### Rules

Rules live in a dedicated compact surface, for example:

`Best of 5 · Win 2 · Draw 0 · Loss 0`

`Table: Points → Legs won → Head-to-head`

They must remain readable and secondary, never washed-out filler.

### Standings

Standings are the primary information card.

On 320–412px screens, show the primary mobile contract:

`POS | PLAYER | P | W-D-L | PTS`

`LEGS` and `AVG` are progressive/secondary information and must not force a squeezed seven-column phone table.

At wider widths, expose the complete standings set intentionally.

A contextual rank/encouragement panel is optional and must be truthful. Do not celebrate a meaningless one-player 0–0 table.

### Sign-in/member action

For signed-out visitors, use a compact horizontal card after standings. Explain why authentication matters and keep Google as the only sign-in method.

For signed-in players, the same visual slot becomes a useful competition action rather than duplicated account identity.

### Latest results

Latest results follows standings/action and supports data, genuine empty and explicit failure/retry states.

## Navigation

The intended signed-in mobile information architecture is:

`League · Fixtures · Results · More`

- Bottom navigation is app-like and safe-area aware.
- The active item uses the green club accent.
- Never expose a destination that the current user cannot actually use.
- Until permission-safe player/public fixture reads exist, Fixtures must not route a normal user to an admin-only endpoint.
- Admin navigation remains task-oriented but follows the same visual language and quality bar.

## Responsive rules

### Required acceptance widths

- 320px
- 375px
- 390px
- 412px
- 768px
- desktop at 960px+

### Mobile 320–680px

- single product column;
- 16–20px usable page gutters;
- zero page-level horizontal overflow;
- no clipped headings/copy;
- standings begin early in the experience;
- 44px minimum interactive targets;
- bottom navigation never overlays content;
- cards reflow rather than shrink indiscriminately.

### Tablet 681–959px

- preserve the mobile hierarchy;
- allow cards/table details to widen intentionally;
- use whitespace to separate product units rather than inserting extra headings.

### Desktop 960px+

- the same product hierarchy expands rather than transforming into unrelated SaaS dashboard chrome;
- complete standings information can be visible;
- member/admin rails are acceptable where they materially improve navigation;
- content uses width intentionally rather than merely stretching the phone layout.

## Interaction and accessibility

- 44px minimum touch targets.
- Visible `:focus-visible` treatment using the green accent for normal navigation/actions; danger controls may use red.
- Buttons and icon-only actions have accessible names.
- Semantic heading hierarchy and landmarks.
- WCAG-conscious contrast for all body/rule/status text.
- Destructive actions remain explicit and protected.
- Motion is restrained; `prefers-reduced-motion` is respected.
- Decorative imagery never carries essential meaning.

## Card rules

Cards are encouraged when they represent real product units:

- current league;
- rules;
- standings;
- contextual player/sign-in action;
- latest results.

Cards are rejected when they are generic promotional KPI tiles, duplicate information already visible elsewhere, or decorative containers with no task/information boundary.

## Anti-patterns

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

Material responsive releases are accepted against the rendered product, not automated checks alone.

For material UI releases include:

- screenshot review at 320, 375/390, 412, 768 and desktop widths;
- overflow and touch-target checks;
- focused user-journey regressions where practical;
- Impeccable review;
- one clean full repository gate before merge.

A visibly broken mobile layout fails acceptance even if unit tests are green.
