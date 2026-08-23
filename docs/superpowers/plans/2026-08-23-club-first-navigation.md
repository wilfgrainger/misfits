# Club-first Member Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the signed-in league-framed member experience with the approved club-first `Home · Record · Leagues · More` model while preserving all private-club, competition and Cloudflare boundaries.

**Architecture:** `App.tsx` remains the authentication/club-data/admin orchestrator. A new `MemberApp` owns only signed-in member navigation and cross-surface intent; Home, Record, Leagues and More become focused components. Competition-specific data stays behind explicit league ids and the existing `ApiClient`; no router, state library, backend endpoint, schema migration or Cloudflare service is added.

**Tech Stack:** React 19, TypeScript, Vite, Vitest + Testing Library, existing Worker/D1 APIs, repo-local Impeccable and Cave Pony workflows.

**Spec:** `docs/superpowers/specs/2026-08-23-club-first-navigation-design.md`

## Global Constraints

- Signed-in primary member navigation is exactly `Home · Record · Leagues · More`.
- Approved members land on Home.
- `users.club_status` remains permanent club membership authority; `league_players` remains competition participation authority.
- Signed-out, pending and rejected members never mount club data or member navigation.
- Existing Worker + static assets + D1 only; Cloudflare free tier only.
- No React Router, global state library, backend endpoint, D1 migration, KV, R2, Durable Object, Queue, scheduled job or background polling.
- Record is task-first; one eligible league skips the chooser, many eligible leagues show the chooser, zero eligible leagues show a non-recordable state.
- Leagues owns competition browsing with local `Table · Fixtures · Results` tabs.
- More owns Players, Profile, Admin for admins, and Sign out.
- Misfits red owns active interaction; green is semantic positive state only.
- 44px minimum touch targets and zero page-level overflow at 320, 360, 375, 390, 412, 430, 768 and 1024px+.
- Preserve current result submit/confirm/dispute validation and accessible dispute-dialog behaviour.

---

## File structure

### Create

- `src/client/components/MemberApp.tsx` — global signed-in member state and bottom navigation only.
- `src/client/components/MemberHome.tsx` — competition summary and `Needs you` attention surface.
- `src/client/components/MemberRecord.tsx` — global competition chooser and result-entry flow.
- `src/client/components/MemberLeagues.tsx` — competition browser and selected-league workspace shell.
- `src/client/components/LeagueWorkspace.tsx` — selected league `Table · Fixtures · Results` content and result review.
- `src/client/components/MemberMore.tsx` — Players/Profile/Admin/Sign out secondary destinations.
- `tests/client/club-first-navigation.test.tsx` — app-shell/navigation/deep-link acceptance.
- `tests/client/member-home.test.tsx` — Home competitions and attention behaviour.
- `tests/client/member-record.test.tsx` — zero/one/many competition Record behaviour.
- `tests/client/member-leagues.test.tsx` — local league tabs, fixtures and result review.

### Modify

- `src/client/App.tsx` — render `MemberApp`, remove signed-in success strip/header sign-out and old global league selection UI.
- `src/client/components/AppIcons.tsx` — add a Home icon only if the existing icon set does not already provide one.
- `src/client/member-experience.css` — replace old league-framed signed-in composition with club-first surfaces.
- `src/client/mobile-experience.css` — remove/adjust rules that assume a global league hero/selector and protect the new compact shell.
- `src/client/private-club.css` — keep entry-state rules; remove signed-in header/sign-out assumptions that conflict with the compact member header.
- `src/client/styles.css` — only shared primitives/tokens needed by the new components; do not duplicate component-specific rules.
- `tests/client/member-navigation.test.tsx` — retire old `League · Record · Results · More` assertions in favour of component-level responsibilities or delete once fully superseded.
- `tests/client/player-app.test.tsx` — update result-entry/result-review tests to render their new focused component owners.
- `tests/client/league-switch-race.test.tsx` — move race protection to `LeagueWorkspace` selection/load behaviour if still applicable.
- `tests/client/private-club-entry.test.tsx` — assert approved member shell starts at Home and privacy states still mount no member navigation.
- `tests/client/app-league-create.test.tsx` — keep zero-league admin bootstrap working through More → Admin.
- `tests/client/platform-assets.test.ts` / `tests/client/app-ux-compression.test.tsx` — update structural/static UI assertions where old hero/nav selectors were intentionally retired.
- `DESIGN.md` — make the club-first spec the standing signed-in navigation authority and retire contradictory old navigation text.
- `PROGRESS.md` — record branch, plan, implementation checkpoint, verification and handoff state.

### Delete after callers/tests move

- `src/client/components/PlayerLeague.tsx` — responsibilities split across Record, Leagues/LeagueWorkspace and More.
- `src/client/components/EmptyMemberWorkspace.tsx` — zero-league states become normal `MemberApp` surface states.
- `src/client/components/LeagueTabs.tsx` — global league selector is removed; league selection lives inside Leagues/Record.

---

### Task 1: Establish the club-level member shell

**Files:**
- Create: `src/client/components/MemberApp.tsx`
- Modify: `src/client/App.tsx`
- Modify: `tests/client/member-navigation.test.tsx`
- Modify: `tests/client/private-club-entry.test.tsx`
- Test: `tests/client/club-first-navigation.test.tsx`

**Interfaces:**
- Consumes: `UserSummary`, `LeagueSummary`, existing `onOpenAdmin`, `onSignOut`, `onUserSaved` callbacks.
- Produces:
  ```ts
  export type MemberView = 'home' | 'record' | 'leagues' | 'more';
  export type LeagueView = 'list' | 'table' | 'fixtures' | 'results';
  export interface RecordIntent { leagueId?: string; fixtureId?: string; }
  export interface MemberAppProps {
    user: UserSummary;
    clubLeagues: LeagueSummary[];
    myLeagues: LeagueSummary[];
    onUserSaved: (user: UserSummary) => void;
    onOpenAdmin?: () => void;
    onSignOut: () => void;
  }
  ```
- Later tasks rely on `openLeague(leagueId, view?)`, `openRecord(intent?)` behaviour internal to `MemberApp`.

- [ ] **Step 1: Rewrite the navigation test RED**

Replace the old primary-nav assertion with:

```tsx
it('uses Home, Record, Leagues and More as the only global member destinations', () => {
  render(<MemberApp user={player} clubLeagues={[league]} myLeagues={[league]} onUserSaved={vi.fn()} onSignOut={vi.fn()} />);

  const nav = screen.getByRole('navigation', { name: 'Member workspace' });
  expect(within(nav).getAllByRole('button').map((button) => button.textContent?.trim()))
    .toEqual(['Home', 'Record', 'Leagues', 'More']);
  expect(within(nav).queryByRole('button', { name: 'League' })).toBeNull();
  expect(within(nav).queryByRole('button', { name: 'Results' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
});
```

Add an App-level assertion in `private-club-entry.test.tsx` that a signed-in approved response shows `Home` and does not render the previous `Your Misfits 501 club workspace is ready.` message.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
./node_modules/.bin/vitest run tests/client/member-navigation.test.tsx tests/client/private-club-entry.test.tsx
```

Expected: FAIL because `MemberApp` does not exist and approved users still render the old league-framed navigation/success message.

- [ ] **Step 3: Implement the minimal `MemberApp` shell**

Create the global state and navigation first, with temporary semantic placeholders for later surfaces:

```tsx
export type MemberView = 'home' | 'record' | 'leagues' | 'more';
export type LeagueView = 'list' | 'table' | 'fixtures' | 'results';
export interface RecordIntent { leagueId?: string; fixtureId?: string; }

export function MemberApp(props: MemberAppProps) {
  const [view, setView] = useState<MemberView>('home');
  const [leagueIntent, setLeagueIntent] = useState<{ leagueId: string; view: Exclude<LeagueView, 'list'> } | null>(null);
  const [recordIntent, setRecordIntent] = useState<RecordIntent | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const openLeague = (leagueId: string, leagueView: Exclude<LeagueView, 'list'> = 'table') => {
    setLeagueIntent({ leagueId, view: leagueView });
    setView('leagues');
  };
  const openRecord = (intent: RecordIntent = {}) => {
    setRecordIntent(intent);
    setView('record');
  };
  const markChanged = () => setRefreshKey((value) => value + 1);

  return <section className="member-app" aria-label="Misfits member app">
    <div className="member-app-content">
      {view === 'home' && <section aria-labelledby="home-title"><h1 id="home-title">Home</h1></section>}
      {view === 'record' && <section aria-labelledby="record-title"><h1 id="record-title">Record</h1></section>}
      {view === 'leagues' && <section aria-labelledby="leagues-title"><h1 id="leagues-title">Leagues</h1></section>}
      {view === 'more' && <section aria-labelledby="more-title"><h1 id="more-title">More</h1></section>}
    </div>
    <nav className="member-app-nav" aria-label="Member workspace">
      {(['home', 'record', 'leagues', 'more'] as const).map((item) => <button
        key={item}
        type="button"
        className={view === item ? 'member-app-nav-item member-app-nav-active' : 'member-app-nav-item'}
        aria-current={view === item ? 'page' : undefined}
        onClick={() => {
          if (item === 'leagues') setLeagueIntent(null);
          if (item === 'record') setRecordIntent(null);
          setView(item);
        }}
      ><AppIcon name={item} /><span>{item[0].toUpperCase() + item.slice(1)}</span></button>)}
    </nav>
  </section>;
}
```

If `AppIcon` lacks `home`, add a simple existing-style SVG path under the exact `home` key rather than a new icon dependency.

In `App.tsx`:

- remove `selectedLeagueId` from member mode;
- keep `adminSelectedLeagueId` independent;
- render `MemberApp` for approved signed-in members;
- stop setting/rendering the permanent signed-in success message;
- remove approved-member header Sign out because More will own it.

- [ ] **Step 4: Run focused tests GREEN**

Run the same command. Expected: PASS for the new nav/default Home/private-entry assertions; temporary Home/Record/Leagues/More bodies are acceptable only until the next tasks.

- [ ] **Step 5: Commit**

```bash
git add src/client/App.tsx src/client/components/MemberApp.tsx src/client/components/AppIcons.tsx tests/client/member-navigation.test.tsx tests/client/private-club-entry.test.tsx tests/client/club-first-navigation.test.tsx
git commit -m "feat: add club-first member shell"
```

---

### Task 2: Build Home and cross-surface attention intents

**Files:**
- Create: `src/client/components/MemberHome.tsx`
- Modify: `src/client/components/MemberApp.tsx`
- Test: `tests/client/member-home.test.tsx`
- Test: `tests/client/club-first-navigation.test.tsx`

**Interfaces:**
- Consumes:
  ```ts
  interface MemberHomeProps {
    user: UserSummary;
    clubLeagues: LeagueSummary[];
    myLeagues: LeagueSummary[];
    refreshKey: number;
    onOpenLeague: (leagueId: string, view?: 'table' | 'fixtures' | 'results') => void;
    onOpenRecord: (intent: RecordIntent) => void;
  }
  ```
- Produces no persistence; it emits only navigation intents.

- [ ] **Step 1: Write RED Home tests**

Cover multiple competitions and a pending result:

```tsx
it('shows all visible competitions without a global league selector', async () => {
  mockHomeFetch({ results: [], fixturesByLeague: {} });
  render(<MemberHome user={player} clubLeagues={[league501, league301]} myLeagues={[league501]} refreshKey={0} onOpenLeague={vi.fn()} onOpenRecord={vi.fn()} />);

  expect(screen.getByRole('heading', { name: 'Your competitions' })).toBeTruthy();
  expect(screen.getByRole('button', { name: /501 League/ })).toBeTruthy();
  expect(screen.getByRole('button', { name: /301 League/ })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'Needs you' })).toBeNull();
});

it('routes an opponent-submitted pending result to that league Results view', async () => {
  const onOpenLeague = vi.fn();
  mockHomeFetch({ results: [pendingOpponentResult], fixturesByLeague: {} });
  render(<MemberHome user={player} clubLeagues={[league501]} myLeagues={[league501]} refreshKey={0} onOpenLeague={onOpenLeague} onOpenRecord={vi.fn()} />);

  fireEvent.click(await screen.findByRole('button', { name: /Review result/ }));
  expect(onOpenLeague).toHaveBeenCalledWith(league501.id, 'results');
});
```

Add a fixture action test expecting `onOpenRecord({ leagueId, fixtureId })`.

- [ ] **Step 2: Run RED**

```bash
./node_modules/.bin/vitest run tests/client/member-home.test.tsx tests/client/club-first-navigation.test.tsx
```

Expected: FAIL because Home is still a placeholder.

- [ ] **Step 3: Implement `MemberHome` with existing APIs**

Use `api.myResults()` once and `api.fixtures(league.id)` only for open member-assigned leagues. Derive actionable pending results with the same existing rule used by `PlayerLeague`:

```ts
const pendingForMe = results.filter((result) =>
  result.status === 'PENDING' && result.submittedBy !== user.id,
);
```

Fetch fixture attention with bounded `Promise.all` over `myLeagues.filter((league) => league.status === 'OPEN')`, then keep only fixtures where the current player is A or B and status is `OUTSTANDING`.

Render:

```tsx
<section className="member-home">
  <header className="member-home-heading">
    <p className="entry-kicker">Misfits</p>
    <h1>Good to see you, {user.username}</h1>
  </header>
  <section aria-labelledby="competitions-title">
    <h2 id="competitions-title">Your competitions</h2>
    <div className="competition-list">{clubLeagues.map(/* compact button row */)}</div>
  </section>
  {attention.length > 0 && <section aria-labelledby="needs-you-title"><h2 id="needs-you-title">Needs you</h2>{/* action rows */}</section>}
</section>
```

Do not make time-of-day logic a dependency; the greeting stays truthful without clock access.

- [ ] **Step 4: Wire Home in `MemberApp` and run GREEN**

Pass `openLeague`, `openRecord`, and `refreshKey`. Run the focused command and expect PASS.

- [ ] **Step 5: Commit**

```bash
git add src/client/components/MemberHome.tsx src/client/components/MemberApp.tsx tests/client/member-home.test.tsx tests/client/club-first-navigation.test.tsx
git commit -m "feat: add member home and attention actions"
```

---

### Task 3: Extract global Record from the league workspace

**Files:**
- Create: `src/client/components/MemberRecord.tsx`
- Modify: `src/client/components/MemberApp.tsx`
- Modify: `tests/client/player-app.test.tsx`
- Modify: `tests/client/player-scoring-rules.test.tsx`
- Test: `tests/client/member-record.test.tsx`

**Interfaces:**
- Consumes:
  ```ts
  interface MemberRecordProps {
    user: UserSummary;
    myLeagues: LeagueSummary[];
    intent: RecordIntent | null;
    refreshKey: number;
    onChanged: () => void;
    onClearIntent: () => void;
  }
  ```
- Produces result mutations only through existing `ApiClient.submitResult` / `submitFixtureResult`.

- [ ] **Step 1: Write RED chooser tests**

```tsx
it('skips competition choice when exactly one open assigned league is eligible', async () => {
  mockRecordLeague(league501);
  render(<MemberRecord user={player} myLeagues={[league501]} intent={null} refreshKey={0} onChanged={vi.fn()} onClearIntent={vi.fn()} />);
  expect(await screen.findByRole('heading', { name: 'Record your result' })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'What are you recording?' })).toBeNull();
});

it('asks which competition when more than one open assigned league is eligible', () => {
  render(<MemberRecord user={player} myLeagues={[league501, league301]} intent={null} refreshKey={0} onChanged={vi.fn()} onClearIntent={vi.fn()} />);
  expect(screen.getByRole('heading', { name: 'What are you recording?' })).toBeTruthy();
  expect(screen.getByRole('button', { name: /501 League/ })).toBeTruthy();
  expect(screen.getByRole('button', { name: /301 League/ })).toBeTruthy();
});

it('shows a non-recordable state when no open assigned league is eligible', () => {
  render(<MemberRecord user={player} myLeagues={[]} intent={null} refreshKey={0} onChanged={vi.fn()} onClearIntent={vi.fn()} />);
  expect(screen.getByText(/no open competition to record/i)).toBeTruthy();
});
```

Add an intent test: `intent={{ leagueId: league501.id, fixtureId: fixture.id }}` preselects that league/fixture.

- [ ] **Step 2: Run RED**

```bash
./node_modules/.bin/vitest run tests/client/member-record.test.tsx tests/client/player-scoring-rules.test.tsx tests/client/player-app.test.tsx
```

Expected: FAIL because result-entry is still embedded in `PlayerLeague`.

- [ ] **Step 3: Implement eligibility and record state**

Use:

```ts
const eligible = myLeagues.filter((league) => league.status === 'OPEN');
const initialLeagueId = intent?.leagueId && eligible.some((league) => league.id === intent.leagueId)
  ? intent.leagueId
  : eligible.length === 1 ? eligible[0].id : null;
```

Once a league is selected, fetch only what Record needs:

```ts
const [detailPayload, fixturePayload] = await Promise.all([
  api.publicLeague(league.id),
  api.fixtures(league.id).catch(() => ({ fixtures: [] })),
]);
```

Move the existing fixture picker, opponent picker, legs/average fields and `submitResult` logic from `PlayerLeague` without changing server payload semantics. Preserve `effectiveMaxLegs`, `legsToWin`, and `matchFormatDescription` use.

On success:

```ts
setNotice('Result sent to your opponent.');
resetForm();
onChanged();
```

Expose `Choose another competition` only when `eligible.length > 1`.

- [ ] **Step 4: Move scoring/result-entry tests to the new owner and run GREEN**

Update `player-scoring-rules.test.tsx` to render `MemberRecord` for format/target-leg behaviour. Keep API payload assertions unchanged.

Run the focused command and expect PASS.

- [ ] **Step 5: Commit**

```bash
git add src/client/components/MemberRecord.tsx src/client/components/MemberApp.tsx tests/client/member-record.test.tsx tests/client/player-app.test.tsx tests/client/player-scoring-rules.test.tsx
git commit -m "feat: make result recording competition-aware"
```

---

### Task 4: Build Leagues browser and competition workspace

**Files:**
- Create: `src/client/components/MemberLeagues.tsx`
- Create: `src/client/components/LeagueWorkspace.tsx`
- Modify: `src/client/components/MemberApp.tsx`
- Modify: `tests/client/league-switch-race.test.tsx`
- Modify: `tests/client/player-app.test.tsx`
- Test: `tests/client/member-leagues.test.tsx`

**Interfaces:**
- `MemberLeagues` consumes:
  ```ts
  interface MemberLeaguesProps {
    user: UserSummary;
    clubLeagues: LeagueSummary[];
    myLeagues: LeagueSummary[];
    intent: { leagueId: string; view: 'table' | 'fixtures' | 'results' } | null;
    refreshKey: number;
    onIntentConsumed: () => void;
    onOpenRecord: (intent: RecordIntent) => void;
  }
  ```
- `LeagueWorkspace` consumes:
  ```ts
  interface LeagueWorkspaceProps {
    user: UserSummary;
    league: LeagueSummary;
    isParticipant: boolean;
    initialView: 'table' | 'fixtures' | 'results';
    refreshKey: number;
    onBack: () => void;
    onOpenRecord: (intent: RecordIntent) => void;
    onChanged: () => void;
  }
  ```

- [ ] **Step 1: Write RED browser/local-nav tests**

```tsx
it('opens a league with local Table Fixtures Results tabs', async () => {
  mockLeagueWorkspace();
  render(<MemberLeagues user={player} clubLeagues={[league501]} myLeagues={[league501]} intent={null} refreshKey={0} onIntentConsumed={vi.fn()} onOpenRecord={vi.fn()} />);

  fireEvent.click(screen.getByRole('button', { name: /501 League/ }));
  const nav = await screen.findByRole('navigation', { name: 'Competition workspace' });
  expect(within(nav).getAllByRole('button').map((button) => button.textContent?.trim()))
    .toEqual(['Table', 'Fixtures', 'Results']);
});

it('sends a recordable fixture to global Record instead of embedding score entry', async () => {
  const onOpenRecord = vi.fn();
  mockLeagueWorkspace({ fixtures: [fixture] });
  render(/* MemberLeagues props */);
  fireEvent.click(screen.getByRole('button', { name: /501 League/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Fixtures' }));
  fireEvent.click(screen.getByRole('button', { name: 'Record' }));
  expect(onOpenRecord).toHaveBeenCalledWith({ leagueId: league501.id, fixtureId: fixture.id });
});
```

Add a result-review test preserving Confirm/Dispute controls and the dispute dialog's Escape/focus contract from existing `player-app.test.tsx` coverage.

- [ ] **Step 2: Run RED**

```bash
./node_modules/.bin/vitest run tests/client/member-leagues.test.tsx tests/client/league-switch-race.test.tsx tests/client/player-app.test.tsx
```

Expected: FAIL because Leagues is still a placeholder and result review remains in `PlayerLeague`.

- [ ] **Step 3: Implement the browser**

`MemberLeagues` starts with a list. If `intent` arrives, select that league and initial local view. A plain global-Leagues tap from `MemberApp` passes `intent={null}` and therefore shows the browser list.

Competition row button:

```tsx
<button className="competition-row" type="button" onClick={() => setSelected({ leagueId: league.id, view: 'table' })}>
  <span><strong>{league.name}</strong><small>{league.seasonName} · {league.status === 'OPEN' ? 'Open' : 'Closed'}</small></span>
  <AppIcon name="chevron" />
</button>
```

- [ ] **Step 4: Implement `LeagueWorkspace` by moving only league-owned behaviour**

Move from `PlayerLeague`:

- standings loading/rendering;
- compact league identity/rules;
- fixtures list browsing;
- confirmed/pending result feed;
- Confirm/Dispute mutation and accessible dialog.

Remove from this component:

- global bottom nav;
- result-entry form;
- More/Profile/Players/Admin/Sign out.

Use local nav:

```tsx
<nav className="competition-workspace-nav" aria-label="Competition workspace">
  {(['table', 'fixtures', 'results'] as const).map((item) => <button
    key={item}
    type="button"
    aria-current={view === item ? 'page' : undefined}
    onClick={() => setView(item)}
  >{item[0].toUpperCase() + item.slice(1)}</button>)}
</nav>
```

Keep the existing request-sequence guard (`loadRequest`) so a slower old league response cannot overwrite the newly selected league.

- [ ] **Step 5: Run focused tests GREEN**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/client/components/MemberLeagues.tsx src/client/components/LeagueWorkspace.tsx src/client/components/MemberApp.tsx tests/client/member-leagues.test.tsx tests/client/league-switch-race.test.tsx tests/client/player-app.test.tsx
git commit -m "feat: add competition browser workspace"
```

---

### Task 5: Move secondary club actions under global More and remove obsolete league shell components

**Files:**
- Create: `src/client/components/MemberMore.tsx`
- Modify: `src/client/components/MemberApp.tsx`
- Modify: `src/client/App.tsx`
- Modify: `tests/client/member-navigation.test.tsx`
- Modify: `tests/client/app-league-create.test.tsx`
- Delete: `src/client/components/PlayerLeague.tsx`
- Delete: `src/client/components/EmptyMemberWorkspace.tsx`
- Delete: `src/client/components/LeagueTabs.tsx`

**Interfaces:**
- Consumes:
  ```ts
  interface MemberMoreProps {
    user: UserSummary;
    clubLeagues: LeagueSummary[];
    onUserSaved: (user: UserSummary) => void;
    onOpenAdmin?: () => void;
    onSignOut: () => void;
  }
  ```
- No new server API.

- [ ] **Step 1: Write RED More/zero-league tests**

```tsx
it('keeps Players Profile Admin and Sign out under More', () => {
  const onOpenAdmin = vi.fn();
  render(<MemberMore user={admin} clubLeagues={[]} onUserSaved={vi.fn()} onOpenAdmin={onOpenAdmin} onSignOut={vi.fn()} />);
  const nav = screen.getByRole('navigation', { name: 'More player options' });
  expect(within(nav).getByRole('button', { name: 'Players' })).toBeTruthy();
  expect(within(nav).getByRole('button', { name: 'Profile' })).toBeTruthy();
  expect(within(nav).getByRole('button', { name: 'Admin' })).toBeTruthy();
  expect(within(nav).getByRole('button', { name: 'Sign out' })).toBeTruthy();
});
```

In `app-league-create.test.tsx`, update the bootstrap journey to click global `More`, then `Admin`, with `clubLeagues=[]`.

- [ ] **Step 2: Run RED**

```bash
./node_modules/.bin/vitest run tests/client/member-navigation.test.tsx tests/client/app-league-create.test.tsx
```

Expected: FAIL because More is still a placeholder.

- [ ] **Step 3: Implement `MemberMore`**

Use internal `menu | players | profile` state as before. Reuse `ProfilePanel` unchanged.

For Players, reuse existing approved-member league detail rather than add a membership endpoint: load `api.publicLeague(league.id)` for visible leagues only when the user opens Players, flatten and dedupe by player id.

```ts
const uniquePlayers = new Map<string, { id: string; username: string | null; profileImageUrl: string | null }>();
for (const detail of details) for (const player of detail.players) uniquePlayers.set(player.id, player);
```

If no leagues exist, render the current calm empty roster state. Do not expose admin membership records to ordinary members.

- [ ] **Step 4: Wire More/Admin return behaviour and remove dead components**

`MemberApp` renders `MemberMore` when `view === 'more'`.

`App.tsx` continues to own `adminMode` and `adminSelectedLeagueId`. Entering Admin suppresses member content; `Back to club` returns to the same mounted `MemberApp` state where practical. If `MemberApp` must unmount under current structure, return to More explicitly rather than reintroduce selected-league global state.

After all imports/tests have moved, delete `PlayerLeague.tsx`, `EmptyMemberWorkspace.tsx`, and `LeagueTabs.tsx`.

- [ ] **Step 5: Run focused tests GREEN and check dead references**

```bash
./node_modules/.bin/vitest run tests/client/member-navigation.test.tsx tests/client/app-league-create.test.tsx
rg "PlayerLeague|EmptyMemberWorkspace|LeagueTabs" src tests
```

Expected: tests PASS; `rg` returns no runtime/test imports of deleted components (historical docs may still mention them).

- [ ] **Step 6: Commit**

```bash
git add src/client/App.tsx src/client/components/MemberApp.tsx src/client/components/MemberMore.tsx tests/client/member-navigation.test.tsx tests/client/app-league-create.test.tsx
git rm src/client/components/PlayerLeague.tsx src/client/components/EmptyMemberWorkspace.tsx src/client/components/LeagueTabs.tsx
git commit -m "refactor: retire league-framed member shell"
```

---

### Task 6: Apply the premium club-first visual system with Impeccable authority

**Files:**
- Modify: `src/client/member-experience.css`
- Modify: `src/client/mobile-experience.css`
- Modify: `src/client/private-club.css`
- Modify: `src/client/styles.css`
- Modify: `src/client/main.tsx` only if a stylesheet becomes truly empty/obsolete and can be removed cleanly.
- Modify: `tests/client/app-ux-compression.test.tsx`
- Modify: `tests/client/platform-assets.test.ts`

**Interfaces:** CSS class contracts introduced by Tasks 1–5 only. No data/API changes.

- [ ] **Step 1: Read and follow repo-local Impeccable guidance**

Read `.agents/skills/impeccable/SKILL.md` (or its documented entry file) before styling. Treat it as UI authority; do not invent a second visual system.

- [ ] **Step 2: Add RED structural/static UX assertions**

Protect the intended deletions/additions, for example:

```ts
expect(source).not.toContain('Your Misfits 501 club workspace is ready.');
expect(source).not.toContain('player-league-hero');
expect(source).toContain('member-home');
expect(source).toContain('competition-list');
expect(source).toContain('competition-workspace-nav');
```

Keep existing static guards for minimum touch size, safe-area bottom padding and no horizontal overflow rules.

- [ ] **Step 3: Run RED**

```bash
./node_modules/.bin/vitest run tests/client/app-ux-compression.test.tsx tests/client/platform-assets.test.ts
```

Expected: FAIL until old league-framed selectors/composition are removed.

- [ ] **Step 4: Style the new surfaces and prune obsolete rules**

Implement one deliberate visual hierarchy:

```css
.member-app-content {
  padding-bottom: calc(6.5rem + env(safe-area-inset-bottom));
}

.member-home,
.member-record,
.member-leagues,
.member-more,
.league-workspace {
  display: grid;
  gap: 1rem;
}

.competition-list {
  display: grid;
  gap: .65rem;
}

.competition-row {
  min-height: 4.75rem;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
}

.competition-workspace-nav {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
```

Use existing colour/type tokens. Keep member cards compact; do not recreate a hero using larger padding elsewhere.

Remove obsolete selectors only after verifying no remaining component uses them. Do not perform a stylesheet-consolidation project unless the changed files prove one file is entirely obsolete; the goal is fewer conflicting rules, not churn.

- [ ] **Step 5: Run focused tests plus Impeccable detector**

```bash
./node_modules/.bin/vitest run tests/client/app-ux-compression.test.tsx tests/client/platform-assets.test.ts
node .agents/skills/impeccable/scripts/detect.mjs --json src/client
```

Expected: tests PASS and detector reports no unresolved findings for the changed surface.

- [ ] **Step 6: Commit**

```bash
git add src/client/*.css src/client/main.tsx tests/client/app-ux-compression.test.tsx tests/client/platform-assets.test.ts
git commit -m "style: make member app club-first"
```

---

### Task 7: Update durable authority, run simplicity review and complete the release gate

**Files:**
- Modify: `DESIGN.md`
- Modify: `PROGRESS.md`
- Modify: `docs/superpowers/plans/2026-08-23-club-first-navigation.md` only to check completed task boxes if the execution workflow records them here.

**Interfaces:** Documentation/release evidence only.

- [ ] **Step 1: Update `DESIGN.md` to remove contradictions**

Replace the old approved-member hierarchy/navigation section with durable rules matching the spec:

```text
Club header
→ global Home / Record / Leagues / More
→ task or competition content
→ fixed member navigation
```

State explicitly that `Results` and `Fixtures` are local competition destinations under Leagues, while result entry remains owned by global Record.

Do not alter private entry, auth, colour, standings or admin authority except where wording refers to the retired global navigation.

- [ ] **Step 2: Run the repo-local Cave Pony simplicity review**

Read `.agents/skills/cave-pony/SKILL.md` (or its documented entry file) and review the exact branch diff. Required conclusions to verify with evidence:

- no new infrastructure/service/runtime;
- no router/state-library dependency;
- no duplicate global navigation authority;
- no new backend/schema path;
- no unnecessary component fragmentation or prop-drilled file forest;
- deleted old shell components are genuinely dead.

If Cave Pony identifies a concrete simplification that preserves accessibility/security/data integrity, apply it and rerun affected focused tests before proceeding.

- [ ] **Step 3: Run the exact-head full repository gate**

```bash
npx wrangler types
./node_modules/.bin/tsc -p tsconfig.client.json --noEmit
./node_modules/.bin/tsc -p tsconfig.worker.json --noEmit
./node_modules/.bin/vitest run
./node_modules/.bin/vite build
node .agents/skills/impeccable/scripts/detect.mjs --json src/client
git diff --check
```

Expected: all commands PASS; record actual file/test counts rather than copying old counts.

- [ ] **Step 4: Perform rendered acceptance if browser tooling is available**

Check representative widths from the required set, including at least 320, 390, 430 and 1024px. Verify:

- no horizontal overflow;
- Home competitions appear above secondary detail;
- bottom nav does not cover content;
- Record chooser/form is board-side usable;
- Leagues workspace title/tabs are compact;
- no giant league hero or workspace-ready strip returns;
- avatar/header remain compact;
- desktop uses space intentionally without dashboard KPI furniture.

If rendered tooling is unavailable, write `Rendered acceptance pending: interactive browser unavailable` in `PROGRESS.md`; do not invent evidence.

- [ ] **Step 5: Update `PROGRESS.md` with exact evidence**

Record:

- branch `feat/club-first-navigation`;
- spec and plan paths;
- completed tasks;
- exact verified head SHA;
- actual test count/build/Impeccable/Cave Pony results;
- rendered acceptance status;
- next action: PR review/merge/deploy only after the exact-head gate is green.

Also correct the stale PR #172 release state now that it merged into `main` at `b7a5296665dbbe54eed6572e505ed02404731188` before this branch was cut.

- [ ] **Step 6: Commit release evidence/docs**

```bash
git add DESIGN.md PROGRESS.md docs/superpowers/plans/2026-08-23-club-first-navigation.md
git commit -m "docs: record club-first release evidence"
```

---

## Plan self-review

- Spec coverage: Home, Record zero/one/many eligibility, Leagues browser/local tabs, More, zero-league admin bootstrap, compact header, privacy preservation, responsive/a11y, Impeccable, Cave Pony and full gate each have an owning task.
- Backend/schema coverage: intentionally no implementation task because the approved design requires no backend endpoint or migration; any discovered need upgrades scope rather than being smuggled into this release.
- Type consistency: `MemberView`, `LeagueView`, `RecordIntent`, `openLeague` and `openRecord` names are consistent across tasks.
- Simplicity: no router/store/infrastructure added; old league-shell components are removed only after focused replacements are green.
- Placeholder scan: no TBD/TODO/“implement later” steps remain.
