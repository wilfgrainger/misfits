# Misfits 501 Mobile Experience Reset Design

**Status:** APPROVED visual/product direction  
**Date:** 22 August 2026  
**Scope:** Public and player-facing mobile composition, responsive hierarchy and standing visual system  
**Functional accounting:** Does not alter the canonical 150 functional-story count. The 33 incomplete functional stories remain parked unless separately revalidated.

## 1. Authority

The approved Mobile Experience Reset mockup created on 22 August 2026 is the **visual target** for hierarchy, composition, card rhythm, navigation, colour balance and overall quality.

Implementation may adapt details for real data, accessibility, browser constraints and available capability, but it **must not reinterpret the target back into the previous stacked-web-page composition**.

The broken mobile screenshot that preceded this design is the negative acceptance reference: clipped copy, horizontal overflow, oversized sign-in, repeated league/season headings, large dead vertical gaps and a squeezed seven-column table are all explicitly rejected.

The wider mobile references supplied by the user establish the quality bar: polished, confident, visually authored, mobile-native and calm. Their brand identities and exact layouts are not to be copied.

## 2. Product hierarchy

The mobile product hierarchy is:

```text
Club header
→ League hero
→ Rules strip
→ Standings
→ Contextual member/sign-in action
→ Latest results
→ Mobile app navigation
```

The league and standings are the reason the page exists. Authentication and secondary actions must never visually dominate them.

The first useful club information must appear immediately. On ordinary phone viewports the standings should begin within the first viewport under normal content conditions.

## 3. Mobile shell

### Club header

- Compact branded header using the supplied Misfits club artwork without destructive cropping or recolouring.
- Club name: `Misfits Darts Club`.
- Short club voice line may appear where space allows, e.g. `Throw together. Stand together.`.
- Share is a compact icon/action, never a large primary button.
- Decorative darts imagery is permitted as subtle low-contrast atmosphere only. It must never reduce readability.

### League hero

One canonical hero owns current competition identity:

- league name, e.g. `Misfits 501`;
- season, e.g. `2026 Season`;
- status, e.g. `OPEN`;
- compact metadata such as player count, season state and `501` format where data is available.

Do not repeat the same league/season identity in multiple headings immediately below the hero.

### Rules strip

A compact dedicated rules surface displays the competition contract:

`Best of 5 · Win 2 · Draw 0 · Loss 0`

and beneath it:

`Table: Points → Legs won → Head-to-head`

This must be readable secondary information, not low-contrast filler text.

## 4. Standings

Standings are the primary information surface.

### Mobile row contract: 320–412px

Primary visible columns:

`POS | PLAYER | P | W-D-L | PTS`

`LEGS` and `AVG` are secondary information. They may appear through an expanded/detail presentation or progressively at wider breakpoints, but they must not force the phone layout into a horizontally squeezed seven-column desktop table.

Requirements:

- points remain scan-first;
- player identity remains visually dominant over secondary statistics;
- current signed-in player may be highlighted subtly;
- ranking accents are meaningful, not decorative noise;
- no page-level horizontal scrolling is permitted;
- a table container may not be used as an excuse to ship microscopic text.

A contextual encouragement panel such as `Top of the table` is optional and must only appear when competition data makes it truthful. A single player at 0–0 must not be congratulated for leading a meaningful competition.

## 5. Sign-in and member action

Authentication is secondary to the club record.

For signed-out visitors:

- use a compact horizontal action card;
- explain the benefit, e.g. `Sign in to record or confirm results`;
- keep the Google action obvious but visually subordinate to league/standings content;
- never restore the previous oversized sign-in panel.

For signed-in players, the same location becomes contextual competition action rather than generic account chrome.

## 6. Latest results

Latest confirmed results follow standings and member action.

The section must support three explicit states:

- data available;
- genuine empty state, e.g. `No results yet`;
- load failure with retry.

Failure must never be silently converted into a visually empty page.

## 7. Navigation

The target mobile information architecture is:

`League · Fixtures · Results · More`

This is the intended signed-in member shell.

Capability rules:

- navigation must never advertise a route the current user cannot actually use;
- until public/member fixture reads exist, `Fixtures` may be hidden or disabled according to capability rather than wired to an admin-only endpoint;
- when Fixture-First Player Experience lands, `Fixtures` becomes a first-class member destination;
- admin navigation may remain task-oriented, but must use the same visual language and mobile quality bar.

Bottom navigation must not obscure content and must account for browser/device safe areas.

## 8. Visual system

### Colour

The approved mockup changes normal UI emphasis from red-led to **emerald/club-green-led**.

- Deep charcoal/black remains the base.
- Warm cream/white remains primary text.
- Emerald/club green is the primary interactive accent for active navigation, open status, positive state and selected emphasis.
- Gold is reserved for meaningful ranking/season distinction.
- Red is reserved for destructive, disputed, error or exceptional emphasis. It is not the normal navigation colour.

### Surfaces

- Large but restrained rounded cards are encouraged where they represent meaningful product units: league identity, rules, standings, member action and latest results.
- Cards must have subtle tonal depth and borders rather than bright floating SaaS tiles.
- Iconography should support scanning and club personality.
- Avoid pill overload, generic KPI cards and decorative metrics.

### Typography

- System sans-serif stack remains the implementation default.
- No external font dependency is required to achieve the target.
- Strong hierarchy comes from scale, weight, spacing and contrast rather than novelty fonts.
- Numeric data uses tabular numerals.

## 9. Responsive contract

Hard acceptance viewports:

- 320px
- 375px
- 390px
- 412px
- 768px
- desktop at 960px+

Requirements:

- zero horizontal page overflow;
- 16–20px usable mobile gutters;
- minimum 44px touch targets;
- no clipped copy;
- no navigation/content overlap;
- league content appears before authentication;
- cards reflow instead of merely shrinking;
- at 768/960px+ the same hierarchy expands gracefully and complete table information can reappear;
- desktop is an expanded version of the same product, not a separate generic admin-dashboard aesthetic.

## 10. Accessibility

- WCAG-conscious contrast on all body/rule/status text.
- Visible keyboard focus states.
- Semantic headings and landmarks.
- Buttons/links have accessible names independent of icons.
- `prefers-reduced-motion` respected.
- Decorative imagery remains non-essential to comprehension.

## 11. Acceptance method

Material responsive UI releases are judged by **rendered experience as well as automated checks**.

Required evidence for this release:

1. screenshot review at 320, 375/390, 412, 768 and desktop widths;
2. no horizontal overflow at required mobile widths;
3. automated client regression coverage for hierarchy/critical actions where practical;
4. Impeccable review because this is a material visual/interaction reset;
5. one full repository gate before merge.

Passing CSS lint/tests does not override a visibly broken mobile result.

## 12. Explicit non-goals

This release does **not**:

- add a new router, state framework, component library or Cloudflare service;
- change authentication authority;
- weaken admin-only fixture APIs;
- implement the parked Fixture-First Player Experience backend work;
- change competition scoring, standings rules, promotion logic or D1 schema;
- close any of the 33 parked functional stories without separate acceptance evidence.
