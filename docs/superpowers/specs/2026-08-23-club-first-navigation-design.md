# Club-first member navigation design

**Date:** 23 August 2026  
**Status:** Approved design authority for the next member-UX release  
**Branch:** `feat/club-first-navigation`

## Decision

Misfits is a private darts club first. A league is content inside the club, not the frame of the whole application.

The signed-in member navigation becomes exactly:

`Home · Record · Leagues · More`

This replaces the global `League · Record · Results · More` model introduced by the private-club release. Results and fixtures remain important, but they become competition-scoped content rather than global application destinations.

The change is an information-architecture and visual simplification. It does **not** change club membership authority, league participation authority, result integrity, authentication, authorization, D1 schema, or Cloudflare architecture.

## Product intent

The first signed-in screen should answer the player's immediate questions without making one league dominate the application:

- What competitions am I in?
- What needs my attention?
- What can I record now?
- Where do I browse a particular competition?

The resulting hierarchy is:

```text
Misfits club shell
├── Home
│   ├── greeting / compact status
│   ├── Your competitions
│   └── Needs you
├── Record
│   ├── eligible competition chooser when needed
│   └── fixture/opponent + score entry
├── Leagues
│   ├── competition browser
│   └── selected competition
│       ├── Table
│       ├── Fixtures
│       └── Results
└── More
    ├── Players
    ├── Profile
    ├── Admin (admins only)
    └── Sign out
```

## Why this supersedes the previous model

The previous `League · Record · Results · More` navigation was correct for establishing a safe private-club release quickly, but it makes the currently selected competition the application frame. That becomes awkward as soon as one approved member can participate in several concurrent competitions such as a 501 league, a 301 league and club playoffs.

The club-first model moves context selection to the point where it is actually needed:

- Home summarizes the club member's current world;
- Record asks which competition is being settled only when ambiguity exists;
- Leagues owns competition browsing;
- More owns secondary account/club destinations.

This preserves a simple four-destination bottom navigation while making multiple competitions a normal state rather than an edge case.

## Constraints

The release must preserve all existing private-club and operational boundaries:

- Google Identity Services remains the only sign-in method.
- The Worker remains authentication and authorization authority.
- `users.club_status` remains permanent club-membership authority.
- `league_players` remains season/league participation authority.
- Approved but unassigned members may browse private competition data but may not record results.
- Pending and rejected members never mount member navigation or club data.
- Existing Worker + static assets + D1 remain the only application architecture.
- Cloudflare free tier only.
- No new router, global state framework, service, queue, KV, R2, Durable Object, scheduled job or background polling.
- No D1 migration is required by this release.
- DartCounter remains the scoring surface; Misfits records settled results.

## Approaches considered

### A. App-level member shell with competition-focused child surfaces — chosen

Lift global member navigation and selected global view out of `PlayerLeague` into the signed-in app layer. Competition-specific surfaces receive a league id/context explicitly and reuse the existing API/domain behaviour.

Advantages:

- matches the product model directly;
- removes league selection from the global frame;
- preserves the current React/state approach;
- allows Record and Leagues to choose competition context independently;
- makes zero, one and many competitions first-class states;
- avoids a dependency or routing rewrite.

### B. Keep `PlayerLeague` as the app shell and wrap it with Home/Leagues selectors — rejected

This would minimize file movement initially but leave two competing navigation authorities: the new global tabs outside and the old league-centric state inside. It would create brittle deep-link/state transitions and retain the exact coupling the redesign is meant to remove.

### C. Introduce React Router or a global state library — rejected

The application currently has a compact signed-in state machine and does not need URL routing or a state framework to express four member destinations. Adding either would increase surface area without improving the club-scale product.

## Signed-in club shell

### Header

The approved-member header is compact and club-owned:

- Misfits identity on the left;
- small avatar/profile affordance on the right;
- no large competition title;
- no permanent sign-out button in the header;
- no permanent green “Your Misfits 501 club workspace is ready” success message.

Sign out remains available through More. The avatar may open Profile/More, but it must not create a fifth global navigation concept.

Signed-out, pending, rejected and nickname-onboarding states retain their privacy-first composition and do not inherit the member bottom navigation.

### Global navigation

The fixed mobile member navigation is exactly:

`Home · Record · Leagues · More`

Rules:

- 44px minimum touch targets;
- safe-area aware;
- selected state uses Misfits red, not green;
- content reserves enough bottom space so navigation never overlays forms or lists;
- desktop uses the same information architecture, expanded intentionally rather than replaced by unrelated dashboard chrome.

## Home

Home is the default signed-in destination.

It is not a dashboard of generic metrics. It contains a small number of real club units.

### Greeting

Use a compact greeting such as `Good morning, Wilf` or a neutral equivalent when time-of-day copy is not available. It must not consume hero-scale vertical space.

### Your competitions

Show visible competitions as clean tappable rows/cards. Each item contains only useful identity/state information, for example:

```text
501 League                         ›
2026 Season · Open
Next match: Dave
```

A competition item opens that competition inside Leagues, defaulting to its Table view.

Participant competitions may include a concise next-fixture line when an outstanding fixture exists. Browse-only competitions remain visible but must not imply that the member can record in them.

When no league exists, Home presents one calm club-level empty state. An approved admin can still reach More → Admin.

### Needs you

This section appears only when there is an actionable member item.

Initial supported actions use existing domain/API concepts:

- a result submitted by an opponent awaiting the member's confirmation or dispute;
- an outstanding fixture in an open competition where the member is a participant.

Actions deep-link within the in-memory member state:

- pending result → the relevant league's Results view;
- outstanding fixture → Record with that competition/fixture selected where practical.

No notifications service, polling or background job is introduced. Home refreshes from normal client data loading and explicit reloads after member actions.

## Record

Record is task-first and global.

### Eligible competitions

A competition is eligible for result entry when:

- the member is assigned to it via `league_players`; and
- the competition is open for result entry.

Closed or browse-only competitions are not presented as recordable choices.

### Competition choice

- zero eligible competitions: show a clear browse-only/no-open-competition state;
- one eligible competition: skip the chooser and enter its record flow directly;
- more than one eligible competition: first show `What are you recording?` with one concise choice per competition.

The member may return to the competition chooser without leaving Record.

### Result flow

After competition selection, preserve current result behaviour:

- if outstanding fixtures exist, choose the fixture first;
- otherwise choose an opponent from that competition;
- enter legs and averages using the competition's configured match format;
- submit for opponent confirmation;
- retain all existing validation and server authority.

After successful submission, remain in Record, clear the completed form/fixture selection and refresh relevant Home/league data.

Record does not become a live scorer.

## Leagues

Leagues is the private competition browser for all club competitions an approved member may view.

### Browser

The initial Leagues view is a compact list of competitions rather than a hero plus selector stack. Each row shows:

- league name;
- season name;
- open/closed state;
- participant/browse-only context only when useful.

Selecting a competition opens its workspace.

### Competition workspace

A competition workspace has a modest title bar and three internal destinations:

`Table · Fixtures · Results`

These are local competition tabs, not global member navigation.

The workspace must avoid repeating league/season identity in stacked headings. Rules are compact and secondary.

#### Table

Retain the established responsive standings contract:

- mobile: `POS | PLAYER | P | W-D-L | PTS`;
- wider layouts may expose legs/average detail intentionally;
- points remain the strongest table number.

#### Fixtures

Fixtures are browseable here for schedule/context, including completed/outstanding status where supported by the existing API.

A fixture that the current member can record may offer an explicit `Record` action that transfers to global Record with this competition/fixture context. The fixture list itself never owns score-entry form state.

#### Results

Results owns confirmed and pending history for the selected competition.

When the current member must confirm/dispute an opponent-submitted result, the review controls remain here. Existing accessible dispute-dialog behaviour is preserved.

### Leaving a competition

A clear back affordance returns from the competition workspace to the Leagues list. The global bottom navigation remains stable throughout.

## More

More stays deliberately plain and useful:

- Players;
- Profile;
- Admin for admins only;
- Sign out.

### Players

Do not add a new persistence model or privileged membership endpoint solely for this release. Reuse the existing player/league data available to approved members and present the club player view consistently with current privacy rules. If no competition has been published, use the existing empty-state semantics.

### Admin

Admin continues to open the existing administration workspace.

Admin league selection remains independent of member competition selection. Returning from Admin restores the member's prior member view/context rather than silently changing their selected competition.

The global member navigation may be suppressed while the dedicated admin workspace is open, as it is today, provided there is an obvious `Back to club` action.

## State architecture

Use explicit React state rather than a new router/store.

Recommended top-level member concepts:

```ts
type MemberView = 'home' | 'record' | 'leagues' | 'more';
type LeagueView = 'list' | 'table' | 'fixtures' | 'results';
```

The signed-in app layer owns:

- global `MemberView`;
- club leagues;
- member-assigned leagues;
- current league context for Leagues;
- optional Record competition/fixture intent;
- admin mode and independent admin league selection.

Competition-focused components own their local loading/form/dialog state.

Avoid a single enormous replacement component. The current `PlayerLeague` responsibilities should be separated along product boundaries, with reusable result/fixture/standings pieces extracted only where sharing is real.

## Data loading

Reuse existing API calls wherever possible:

- `leagues()` for visible club competitions;
- `myLeagues()` for participation;
- `standings(leagueId)` for table;
- `results(leagueId)` and `myResults()` for results/review state;
- `publicLeague(leagueId)` for league/player detail;
- `fixtures(leagueId)` for fixture context;
- existing submit/confirm/dispute methods for result mutation.

No new backend endpoint is required for the initial implementation unless implementation proves an existing API cannot express an approved user journey without materially wasteful or privacy-risky client behaviour. Any such discovery upgrades scope and must be called out before server changes.

Club scale is small enough that limited client aggregation across a member's active competitions is preferable to adding infrastructure. Avoid unbounded eager fan-out: load detailed competition data on demand, and fetch Home attention data only for the member's relevant competitions.

## Error, loading and empty states

Every member destination has deliberate states.

### Home

- club competitions loading;
- no competitions;
- competitions loaded with no actions;
- partial attention-data failure must not erase already loaded competition navigation.

### Record

- no assigned/open competition;
- one eligible competition loading directly;
- many eligible competitions chooser;
- no outstanding fixture;
- competition closed between load and submit: server error shown without losing global navigation.

### Leagues

- no competitions;
- league list available;
- selected league loading/error independently;
- no fixtures/results/table movement.

### More

Profile/Admin/Sign out remain usable even when competition data is unavailable where authorization permits. In particular, zero-league admins must still be able to reach Admin.

## Responsive and visual direction

The visual system remains dull Misfits luxury: near-black/charcoal, warm text, Misfits red interaction, semantic green only for positive state.

This release specifically removes vertical furniture that made the member experience feel like a league website stacked on a phone:

- no giant signed-in league hero at app level;
- no permanent “workspace ready” success strip;
- no global league selector above every task;
- no repeated league/season headings;
- no oversized header sign-out control;
- no generic KPI dashboard tiles.

Competition cards/rows should feel closer to a game-mode selector or club fixture sheet: compact, legible, tactile and specific.

Required responsive acceptance widths remain:

- 320px
- 360px
- 375px
- 390px
- 412px
- 430px
- 768px
- 1024px+

Zero page-level horizontal overflow is mandatory.

## Accessibility

Preserve and extend the current accessibility contract:

- semantic nav landmarks with accurate labels;
- `aria-current` on global and local navigation;
- visible focus treatment;
- keyboard-operable cards/actions;
- 44px touch targets;
- headings reflect club → destination → competition hierarchy;
- dispute dialog retains focus entry, Escape close, containment and focus return;
- state is never communicated by colour alone.

## Testing strategy

Use TDD for behavioural changes.

Client tests must prove at minimum:

1. approved members land on Home;
2. global navigation is exactly `Home · Record · Leagues · More`;
3. old global `League` and `Results` destinations are absent;
4. zero-league admins can still reach More → Admin;
5. Home lists multiple competitions without a global league selector;
6. Home hides `Needs you` when no action exists and shows actionable pending result/fixture items when present;
7. Record skips the chooser for exactly one eligible open participant competition;
8. Record shows a chooser for multiple eligible competitions;
9. Record blocks browse-only/unassigned members without implying club access is missing;
10. Leagues opens a selected competition with local `Table · Fixtures · Results` navigation;
11. a league fixture Record action transfers into global Record context;
12. result confirmation/dispute remains competition-scoped and accessible;
13. More still owns Players, Profile, Admin (admin only) and Sign out;
14. private signed-out/pending/rejected states still mount no club data or member navigation;
15. the permanent signed-in workspace-ready success message is gone.

Existing server/domain tests remain unchanged unless a regression is discovered. No migration test should be added because this release has no schema change.

Static responsive tests/audits must continue to protect supported widths, touch targets and fixed-nav content clearance.

## UI review and simplicity gates

Because this is a material interaction and responsive redesign:

- use the repo-local Impeccable workflow as UI authority during implementation/review;
- run its detector against the changed client surface;
- perform Cave Pony simplicity review before completion;
- reject proposals that add infrastructure, duplicate state authorities, generic dashboard furniture or unnecessary abstractions.

The preferred simplification is product-boundary decomposition, not a forest of tiny prop-drilled files.

## Release verification

Before review/merge, run one fresh full repository gate on the exact branch head:

- Wrangler types;
- client TypeScript;
- Worker TypeScript;
- full Vitest suite;
- production Vite build;
- repo-local Impeccable detector/review;
- `git diff --check`;
- Cave Pony simplicity review.

No production D1 action is part of this release.

Rendered acceptance should verify the member experience at representative phone and desktop widths. If interactive browser evidence is unavailable, record that limitation rather than claiming pixel-perfect acceptance.

## Acceptance summary

The release is complete when an approved member experiences Misfits as a club application rather than a single-league page:

- Home is the useful default;
- Record is task-first across competitions;
- Leagues is the competition browser with local Table/Fixtures/Results;
- More is secondary club/account utility;
- multiple simultaneous competitions feel normal;
- one competition still feels effortless;
- zero competitions remains recoverable for admins;
- all private-club and result-integrity boundaries remain unchanged;
- the implementation stays inside the existing Cloudflare free-tier architecture.
