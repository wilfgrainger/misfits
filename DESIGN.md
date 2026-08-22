# Design System

## Visual world

Misfits 501 is a private darts club app: dark, precise, and confident. The interface
is full dark — deep charcoal surfaces, warm cream text, a vivid club-red accent, and
brass-gold for season/rank markers. It is quiet enough to use weekly and specific enough
that it cannot be mistaken for a generic league dashboard or a government form.

The club seal anchors the header. Every other surface recedes to let the standings
and results be the thing you see first.

## Palette

| Token        | Value     | Role                                     |
|---|---|---|
| `--bg`       | `#0d1110` | App background / dark chrome             |
| `--surface`  | `#151a17` | Panel background                         |
| `--surface-2`| `#1c2320` | Elevated cards, input fields             |
| `--surface-3`| `#232b27` | Active picker rows, hovered surfaces     |
| `--border`   | `#2a332f` | Hairlines, dividers                      |
| `--border-mid`| `#364039`| Stronger borders, input outlines         |
| `--text`     | `#eeeae0` | Primary text (warm white, not clinical)  |
| `--text-2`   | `#a8b0aa` | Secondary text, labels                   |
| `--text-3`   | `#687068` | Muted text, timestamps, placeholders     |
| `--red`      | `#d44040` | Primary accent — action, emphasis, rank  |
| `--gold`     | `#c4a96c` | First-place rank, season markers         |
| `--success`  | `#4a9b6a` | Confirmed results, open status           |
| `--danger`   | `#c04040` | Errors, disputed, closed                 |

## Type

- System sans-serif stack throughout — `ui-sans-serif, system-ui, -apple-system` etc.
- Never restore Inter as a project default. No web font imports.
- Numbers: `font-variant-numeric: tabular-nums` for all scores, positions, legs and averages.
- Points column in standings table: larger, bolder, scan-first (1.15rem, 800 weight).
- First-place points: `--red` accent. First-place rank: `--gold`.

## Surfaces and hierarchy

- **Header**: sticky dark chrome (`--bg`) with the club seal, brand name, avatar, sign-out.
- **Signed-in shell**: the header owns identity; selected season/league context stays compact and close to the working surface.
- **Workspace switcher** (admin only): segmented pill selector — ink fill with cream text on active.
- **Player workspace**: league-heading block gives season/league context, then a horizontally scrollable 44px content-tab row.
- **Standings**: contained table with `--border` outline, banded header, gold first-place rank.
- **Results**: clean list rows with generous vertical padding and subtle hover state.
- **Admin desk**: vertical rail on desktop (960px+), horizontal scroll tabs on mobile.

## Responsive rules

- Mobile (`≤680px`): single column, full-width segmented tabs scroll horizontally, standings scroll.
- Tablet (`681–959px`): panel gains border-radius and border; public intro goes two-column.
- Desktop (`≥960px`): member workspace gets a 15rem sticky season rail; admin desk gets a 14rem
  sticky task rail. Content widens into the freed space, does not merely stretch.
- 320px minimum — tables and forms must remain readable.

## Interaction and accessibility

- 44px minimum touch target on all interactive controls.
- Visible `:focus-visible` ring: 2px `--red`, offset 3px.
- Active segmented tab: red background + white text + subtle glow shadow.
- Active desktop rail tab: red right-border + `--surface-2` background.
- Destructive actions: custom modal sheet, never `window.confirm`.
- Motion: one entrance animation per surface (`club-arrive`). `prefers-reduced-motion` respected.

## Anti-patterns

- No parchment, no beige paper background, no ledger-sheet aesthetic.
- No generic dashboard cards, promotional metrics, or pill overload.
- No decorative section eyebrows or gradient text.
- No artwork behind copy. No default browser-looking form furniture.
- No Inter. No external font imports.
- No white background surfaces inside the signed-in shell.
