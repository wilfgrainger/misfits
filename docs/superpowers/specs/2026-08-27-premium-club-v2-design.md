# Misfits 501 Premium Club V2 Design

## Status and decision

**Approved direction:** Private Club Record Book V2.

This is a material visual and interaction redesign of the Misfits 501 web product. It replaces the current presentation with a more distinctive premium darts-club experience while preserving the existing private-club model, data boundaries, routes, API contracts, scoring integrity, and member/admin task architecture.

The build is code-led. No new public data, account type, persistence, external service, dependency, or Cloudflare resource is introduced.

## Product guardrails

- Misfits 501 remains one private club with many seasons, never a generic league SaaS product or multi-club platform.
- DartCounter remains the scoring surface; Misfits records, confirms, disputes, corrects, and presents settled club results.
- Anonymous, pending, rejected, and suspended states must never mount club members, competitions, standings, fixture, or result data.
- Google Identity Services remains the sole sign-in path. This work does not alter authentication, authorization, invitation admission, or session behaviour.
- The approved-member navigation remains exactly `Home`, `Record`, `Leagues`, and `More`; `Table`, `Fixtures`, and `Results` remain local competition tabs.
- The supplied `public/brand/misfits-501.jpg` remains intact, high-contrast, and never becomes a background behind required copy.
- The fixed product promise is `Club darts, properly settled.` No invented testimonials, player biographies, activity, match statistics, commercial claims, or club history may be authored.

## Audit findings

The live signed-out site is privacy-safe and recognisably Misfits, but it behaves primarily as a centred sign-in holding state. Its small header identity, single card composition, temporary reveal, and weakly differentiated action hierarchy do not give the club or its product promise enough authority.

The repository already contains the stronger product core: a club-first member shell, task-first result recording, local competition workspaces, public-by-choice fixture pages, and an admin desk. These are retained. V2 must make these existing flows feel like one coherent product rather than a collection of correct screens.

## Experience thesis

**Misfits should feel like walking up to a well-kept private darts club record room: a confident threshold outside, then a calm, legible scorebook inside.**

The design refuses two category defaults: a generic sport landing page designed to sell a league, and a metric-card dashboard that turns club work into SaaS administration. It uses near-black club space, warm paper-like type, a precise red line language, restrained surfaces, and real information as the visual material.

### Emotional progression

1. **Visitor:** immediately understands that this is Misfits 501, a private darts club, and sees a straightforward member entrance without seeing protected information.
2. **Invited member:** understands that a Google sign-in begins a membership request and that approval gates club data.
3. **Approved player:** lands in a calm home base with current competitions and actual tasks, then can record or check a result with confidence around a board.
4. **Administrator:** sees a purposeful control room with dense but readable work, not a second competing product shell.

## Information architecture and behavioural contract

### Private entrance and admission states

`App.tsx` retains its existing state selection and Google sign-in slot. The visual hierarchy changes only:

- A branded masthead establishes Misfits and the promise before the access action.
- The access action sits in a distinct, high-contrast admission panel with a plain `Members sign in with Google` label supplied by the existing Google control.
- A concise privacy lock statement remains adjacent to the action; it explains that league tables, results, and member details unlock only after approval.
- The existing invitation, unavailable-league, pending, rejected, suspended, loading, and onboarding states use the same visual family but present one unambiguous next step each.
- Entrance motion is eliminated as a dependency for reading or using the sign-in control. Any decorative transition is brief, non-blocking, and disabled by `prefers-reduced-motion`.

No anonymous navigation, public player count, table snippet, fixture teaser, social proof, join request affordance, or secondary membership path is added.

### Approved member workspace

The existing component responsibilities stay stable:

- `MemberApp` owns the member destination state and data-driven task routing.
- `MemberNavigation` owns the four global member destinations.
- `PlayerLeague` owns existing result, table, fixture, and result-feed logic.
- `PublicLeagueView` remains the deliberately public share surface.
- `AdminCompetitionDesk` remains the administrator control surface.

V2 makes the hierarchy visually explicit:

- A compact masthead treats the club mark and name as a club seal, and retains the labelled profile shortcut.
- Phone navigation remains fixed above the safe area, with a stronger selected state, 44px targets, readable labels, and sufficient content clearance.
- Desktop uses the same four destinations in a restrained horizontal rail; it does not turn into unrelated sidebar/dashboard chrome.
- Home becomes a deliberate two-region composition at desktop widths: player competitions first, then current attention. On phones, it remains a single flowing column ordered by urgency.
- Competition browsing distinguishes the club-level `Leagues` list from the local `Table`, `Fixtures`, and `Results` workspace through typography, spacing, and tab treatment rather than oversized banners.
- Record keeps a single clear result-entry action and never duplicates the workflow or claims to score a live match.
- More groups quiet account and club destinations as purposeful action rows; destructive sign-out stays visibly distinct.

### Dense club records

Tables, fixtures, and results become the club's visual proof:

- Standings use a scorebook grid with a stable rank/name/played/form/points hierarchy. Points remain visually strongest and numeric data remains tabular.
- At mobile widths, the established five-column contract remains primary; secondary legs and averages remain progressive information rather than forcing a compressed table.
- Fixture and result rows use a compact round label, opponent pairing, score/status, and honest operational copy. Confirmed, pending, disputed, outstanding, and void states remain textually explicit as well as colour-coded.
- Real product units may use a raised surface; individual rows and labels must not be wrapped in unnecessary nested cards.

### Public and administrator surfaces

- The public league route continues to expose only the already-approved public fixture data. It inherits the club record-book world and retains a direct privacy statement.
- The administrator task rail remains `Season`, `Leagues`, `Season members`, `Fixtures`, `Results`, `Promotion`, and `Club access` in that order.
- Admin surfaces receive the same spacing, type, status, form, focus, and responsive treatment, with no backend or permission change.

## Visual system

### Palette and material

The existing durable palette remains authoritative: ink `#090d0c`, card `#111715`, raised card `#17201c`, warm text `#f3f5ef`, muted copy `#aab6ae`, Misfits red `#d44040`, and semantic-only green `#63c978`.

V2 expands this through CSS-only material, not new external imagery: a barely perceptible radial club-room glow, fine red registration lines, narrow rules, deep raised panels, and a recurring circular target geometry that echoes the real club mark without imitating it. Background treatment must preserve contrast and never obscure content.

### Typography and rhythm

The system stack remains deliberately dependency-free. Display hierarchy comes from scale, weight, optical line-height, letter spacing, and a controlled 4px spacing rhythm rather than a new web font.

- Private entrance uses one memorable large but readable masthead.
- Signed-in products use compact, operation-first headings rather than marketing hero type.
- Kicker labels are rare, short, and functional.
- Rule text, status labels, forms, action text, and table metadata meet contrast and reflow requirements.
- Numeric records use `font-variant-numeric: tabular-nums`.

### Interaction language

- Misfits red identifies normal primary action, focus visibility, active navigation, and selected local tabs.
- Green appears only for confirmed/open/positive state.
- Every interactive control has a visible focus state and a 44px practical touch target where it is a primary member action.
- Hover enhancement is additive only; touch and keyboard affordances do not depend on it.
- Motion is limited to one short entrance or panel transition family, never blocks content, and has a `prefers-reduced-motion` fallback.

## Technical approach

The redesign stays inside the client presentation layer. It will be implemented with a focused design-token layer and component-scoped class refinements rather than altering server/API code.

### Expected source surfaces

| Surface | Responsibility |
| --- | --- |
| `src/client/App.tsx` | Private entrance composition, durable semantic labels, and root visual-contract comment. |
| `src/client/private-club.css` | Private entrance/admission states, public club record presentation, and shared club shell details. |
| `src/client/club-app.css` | Member workspace composition, navigation, competition cards/workspaces, attention rows, and responsive layout. |
| `src/client/mobile-experience.css` | Phone-first table, rails, clearance, and narrow-screen refinements. |
| `src/client/styles.css` | Consolidate only overlapping global tokens or selectors required to make a coherent system; do not refactor unrelated legacy rules. |
| `src/client/components/MemberApp.tsx` | Add only semantic grouping/hooks necessary to express the approved member layout; preserve its routes and data requests. |
| `src/client/components/MemberNavigation.tsx` | Preserve the four destinations while improving accessible selected-state styling hooks if necessary. |
| `src/client/components/PublicLeagueView.tsx` | Preserve public data contract while adding semantic layout hooks only if the existing DOM cannot express the record-book view. |
| `tests/client/*.test.tsx` | Extend privacy, navigation, responsive, and semantic presentation contracts for V2. |

No migration, Worker route, database query, authentication configuration, dependency, generated asset, or environment setting is in scope.

## Failure, loading, and accessibility behaviour

- Existing `LoadFailure` retry paths remain available and retain their no-repeat-write guarantee.
- Existing empty states remain contextual; V2 improves their hierarchy but does not conceal the reason a member cannot record or see a competition.
- Loading states remain privacy-safe and do not flash protected content.
- Existing tab roles, panel associations, profile button name, modal keyboard behaviour, sign-out labels, and Google sign-in grouping remain intact.
- Colour never becomes the only indicator of a result or access state.
- The finished CSS must satisfy the established widths: 320, 360, 375, 390, 412, 430, 768, and desktop 1024px+ with no page-level horizontal overflow.

## Verification and acceptance

### Focused contracts

- Signed-out, invitation, pending, rejected, suspended, and onboarding tests prove no club data is mounted before approval.
- Member navigation tests prove `Home`, `Record`, `Leagues`, and `More` remain the only global destinations.
- Record and competition-tab tests prove task-first and local-workspace behaviour survives the redesign.
- Responsive tests prove the eight required width bands, phone navigation clearance, touch constraints, and overflow controls.
- Presentation tests assert the fixed promise, private-admission semantics, and the V2 class/landmark contract without overfitting to incidental markup.

### Full release gate

1. Focused tests while implementing each changed surface.
2. `npx wrangler types`.
3. Client and Worker TypeScript checks.
4. Full Vitest suite.
5. Production Vite build.
6. `git diff --check`.
7. Repo-local Impeccable detector for the changed client surface.
8. A rendered mobile and desktop review in one bounded pass, then at most one batched correction pass; retain the evidence in `.impeccable/review/`.
9. Cave Pony simplicity review of the finished diff.

Local verification proves source, contracts, and build quality only. Production deployment, authenticated Google journeys, rendered-device acceptance, and live data behaviour remain separate claims until observed.

## Out of scope

- Live darts scoring, player bios, social tools, payments, tournaments, teams, public marketing, public search discovery, multi-club support, analytics, notifications, and new persistent data.
- Replacing the supplied artwork, fetching stock or generated imagery, external fonts, or new UI dependencies.
- Changes to data visibility, invite mechanics, role handling, result integrity, scoring rules, fixture generation, or admin capabilities.

