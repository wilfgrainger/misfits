# Misfits Weekly Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Misfits 501 as a table-first weekly club record while preserving its real results, invitation, authentication, and sharing behaviours.

**Architecture:** Extract the standings display into one semantic component shared by public and member views. Reshape `App` around a compact shared club header and separate public/member surfaces; reshape `AdminLeagueDesk` around an explicit current-season context and accessible task tabs. Keep all existing API contracts and stored season visibility intact, changing only the private default applied when a new season is created through the form or an API request that omits visibility.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, Cloudflare Worker/D1.

**Spec:** `docs/superpowers/specs/2026-08-21-misfits-weekly-ledger-design.md`

## Global Constraints

- Keep `public/brand/misfits-501.jpg` byte-for-byte unchanged and render it once per page in the shared header only.
- Do not add a D1 migration or alter existing stored `visibility` values.
- New season creation starts with `visibility: 'PRIVATE'` in the form and server validation; administrators and direct API clients can actively select `PUBLIC`.
- Preserve API paths, Google authentication, result confirmation/dispute behaviour, membership, invite mechanics, and public sharing.
- Do not use the old slogan, duplicate seal, `workspace`, `League desk`, `Members' Door`, `No fuss`, or `People` as the club-access task name.
- At 320px, 390px, and desktop widths the document must not horizontally overflow and all administrator task destinations must be visible.
- Every production-code behaviour change starts with a test that was observed failing for the expected reason.

---

### Task 1: Establish a reusable semantic standings record

**Files:**
- Create: `src/client/components/StandingsTable.tsx`
- Create: `tests/client/standings-table.test.tsx`
- Modify: `src/client/App.tsx`
- Modify: `src/client/components/PlayerLeague.tsx`
- Modify: `src/client/styles.css`

**Interfaces:**
- Consumes: `StandingRow` from `src/client/api.ts` and optional `highlightPlayerId?: string`.
- Produces: `StandingsTable({ standings, leagueName, highlightPlayerId })`, a semantic `<table>` labelled with `leagueName + ' standings'`.
- Later tasks rely on its visible headers `Pos`, `Player`, `P`, `W-L`, `Avg`, and `Pts` and its `.standings-table-wrap` / `.standings-table` classes.

- [ ] **Step 1: Write the failing component test**

```tsx
it('labels every standings value so a visitor can read the table without guessing', () => {
  render(<StandingsTable leagueName="Misfits 501" standings={[{ playerId: 'wilf', username: 'Wilf', rank: 1, played: 4, won: 3, lost: 1, average: 47.25, points: 6 }]} />);

  expect(screen.getByRole('table', { name: 'Misfits 501 standings' })).toBeTruthy();
  for (const label of ['Pos', 'Player', 'P', 'W-L', 'Avg', 'Pts']) expect(screen.getByRole('columnheader', { name: label })).toBeTruthy();
  expect(screen.getByRole('cell', { name: '47.25' })).toBeTruthy();
});
```

- [ ] **Step 2: Run the new test to verify RED**

Run: `npm test -- tests/client/standings-table.test.tsx`

Expected: FAIL because `StandingsTable` does not yet exist.

- [ ] **Step 3: Implement the smallest semantic table**

```tsx
export function StandingsTable({ standings, leagueName, highlightPlayerId }: StandingsTableProps) {
  return <div className="standings-table-wrap" tabIndex={0}>
    <table className="standings-table" aria-label={`${leagueName} standings`}>
      <thead><tr><th scope="col">Pos</th><th scope="col">Player</th><th scope="col">P</th><th scope="col">W-L</th><th scope="col">Avg</th><th scope="col">Pts</th></tr></thead>
      <tbody>{standings.map((row) => <tr className={row.playerId === highlightPlayerId ? 'standing-row-you' : undefined} key={row.playerId}><td>{row.rank}</td><th scope="row">{row.username}</th><td>{row.played}</td><td>{row.won}-{row.lost}</td><td>{row.average.toFixed(2)}</td><td>{row.points}</td></tr>)}</tbody>
    </table>
  </div>;
}
```

Use `toFixed(2)` only for the displayed average and preserve the direct empty-state handling in each caller.

- [ ] **Step 4: Replace both hand-built row lists with the new component**

In `PublicLeagueView` and the member Table panel, pass the loaded standings and correct league name; pass the signed-in user ID only for the member highlight. Do not move result, loading, or error logic into the component.

- [ ] **Step 5: Run the focused tests to verify GREEN**

Run: `npm test -- tests/client/standings-table.test.tsx tests/client/public-league.test.tsx tests/client/player-app.test.tsx`

Expected: PASS after updating only assertions that depend on the intentional semantic table change.

- [ ] **Step 6: Commit the isolated table change**

```powershell
git add -- src/client/components/StandingsTable.tsx src/client/App.tsx src/client/components/PlayerLeague.tsx src/client/styles.css tests/client/standings-table.test.tsx
git commit -m "feat: make Misfits standings readable"
```

### Task 2: Replace the public poster with the club record

**Files:**
- Modify: `src/client/App.tsx`
- Modify: `src/client/styles.css`
- Modify: `tests/client/public-league.test.tsx`

**Interfaces:**
- Consumes: the existing `GoogleAuth` mount target, `publicLeagues`, `selectedPublicLeague`, and `PublicLeagueView` API calls.
- Produces: one named shared logo, one public `h1` named `The club table`, direct entry copy, a factual season rule line, and public latest-results/share behaviour.

- [ ] **Step 1: Write the failing public-flow tests**

```tsx
it('puts the club record ahead of sign-in theatre', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: 'Tuesday Club' });

  expect(screen.getByRole('heading', { level: 1, name: 'The club table' })).toBeTruthy();
  expect(screen.getByText('Standings and confirmed results for the current season.')).toBeTruthy();
  expect(screen.getByText('Sign in to record a result or confirm one.')).toBeTruthy();
  expect(screen.queryByText("We just can't hit 180")).toBeNull();
  expect(screen.queryByText('Club darts, properly settled.')).toBeNull();
  expect(screen.getAllByRole('img', { name: 'Misfits 501 club seal' })).toHaveLength(1);
});
```

Add a result fixture and assert that the public view shows `First to 3 legs · 2 points per win` and retains the Share league action.

- [ ] **Step 2: Run the public-flow test to verify RED**

Run: `npm test -- tests/client/public-league.test.tsx`

Expected: FAIL because the old full-screen slogan and duplicate logo are still rendered.

- [ ] **Step 3: Implement the compact public surface**

Replace the signed-out `landing-hero` and `landing-seal` render paths with a compact public introduction. Keep the existing Google button ref and `role="group"`. In the shared header, replace the joke line with `Darts club`. In `PublicLeagueView`, replace `PUBLIC TABLE / {league.seasonName}` with the season/state context and emit the exact rules line from `targetLegs` and `pointsPerWin`.

- [ ] **Step 4: Apply the public CSS composition**

Delete the absolute signed-out header, giant `landing-hero`, and `landing-seal` rules. Add a compact `.public-intro` with a dark but high-contrast surface, a normal header, paper record content, an 320px-safe Google mount width, and no document-level horizontal overflow. Keep the single, subtle public intro reveal behind `prefers-reduced-motion: no-preference`.

- [ ] **Step 5: Run focused tests to verify GREEN**

Run: `npm test -- tests/client/public-league.test.tsx tests/client/share.test.ts tests/client/google-auth.test.ts`

Expected: PASS; shared-link copy and Google mount contracts remain unchanged.

- [ ] **Step 6: Commit the public-record change**

```powershell
git add -- src/client/App.tsx src/client/styles.css tests/client/public-league.test.tsx
git commit -m "feat: lead Misfits with the club table"
```

### Task 3: Make signed-in entry contextual, not promotional

**Files:**
- Modify: `src/client/App.tsx`
- Modify: `src/client/styles.css`
- Modify: `tests/client/app-league-create.test.tsx`

**Interfaces:**
- Consumes: `user`, `myLeagues`, `selectedLeague`, and the existing `AdminLeagueDesk`/`PlayerLeague` props.
- Produces: an account heading and `Current season: [club name] · [season] · [state] · [visibility]` context line before member/admin work, without `page-intro` in the signed-in DOM.

- [ ] **Step 1: Write the failing signed-in entry test**

```tsx
it('takes an authenticated club member straight to their current season', async () => {
  state.user.role = 'PLAYER';
  state.myLeagues = [createdLeague];
  render(<App />);

  await screen.findByText('Current season: Tuesday Club · 2026 · Open · Public');
  expect(screen.queryByText('Club darts, properly settled.')).toBeNull();
  expect(screen.getByRole('heading', { name: 'Tuesday Club' })).toBeTruthy();
});
```

- [ ] **Step 2: Run the entry test to verify RED**

Run: `npm test -- tests/client/app-league-create.test.tsx`

Expected: FAIL because the signed-in route still renders `page-intro` and does not expose the current-season sentence.

- [ ] **Step 3: Implement the signed-in context**

Render the marketing introduction only for `signed-out`. Add a small account-context element after the account heading when `selectedLeague` exists, with the literal state order from the test. Do not fabricate a season for users without one; preserve the invite/profile empty state.

- [ ] **Step 4: Remove obsolete signed-in hero CSS and polish account context**

Ensure dark surfaces only contain high-contrast header text. Give `.account-context` the ruled, factual treatment from the spec; do not add cards, pills, metrics, or an eyebrow label.

- [ ] **Step 5: Run focused tests to verify GREEN**

Run: `npm test -- tests/client/app-league-create.test.tsx tests/client/account-profile.test.tsx tests/client/invite-onboarding.test.tsx`

Expected: PASS with the existing invite and profile journeys unchanged.

- [ ] **Step 6: Commit the signed-in-entry change**

```powershell
git add -- src/client/App.tsx src/client/styles.css tests/client/app-league-create.test.tsx
git commit -m "feat: show current season after sign-in"
```

### Task 4: Rebuild season administration around the current club state

**Files:**
- Modify: `src/client/components/AdminLeagueDesk.tsx`
- Modify: `src/server/domain/league.ts`
- Modify: `src/client/styles.css`
- Modify: `tests/client/player-app.test.tsx`
- Modify: `tests/client/app-league-create.test.tsx`
- Modify: `tests/domain/league.test.ts`
- Modify: `tests/server/league-routes.test.ts`

**Interfaces:**
- Consumes: `LeagueSummary`, `createAdminLeague`, `updateAdminLeague`, `validateLeagueInput`, and existing member/invite/result/player operations.
- Produces: a `Season admin` region; keyboard-operable task tabs; `Current season: [club name] · [season] · [state] · [visibility]` context; closed new-season disclosure; and a private default that applies to browser and direct API creation.

- [ ] **Step 1: Write the failing private-default tests**

```ts
it('defaults an omitted create visibility to private without changing an explicit public choice', () => {
  const base = { name: 'Friday Club', seasonName: '2027', maxPlayers: 8, matchesPerPair: 1, targetLegs: 3, pointsPerWin: 2 };

  expect(validateLeagueInput(base, 'create').visibility).toBe('PRIVATE');
  expect(validateLeagueInput({ ...base, visibility: 'PUBLIC' }, 'create').visibility).toBe('PUBLIC');
});
```

Add a `POST /api/admin/leagues` case without `visibility` that asserts the created season is private and absent from the public list. In the client test, use a `createAdminLeague(input)` mock that records `input`, open the details disclosure, complete the labelled form, submit it, and assert the recorded input has `visibility: 'PRIVATE'`.

- [ ] **Step 2: Run the private-default tests to verify RED**

Run: `npm test -- tests/domain/league.test.ts tests/server/league-routes.test.ts tests/client/app-league-create.test.tsx`

Expected: FAIL because create validation and the new-season select both still default to `PUBLIC`.

- [ ] **Step 3: Implement the private default at both creation boundaries**

Use the existing `mode` argument in `src/server/domain/league.ts`: create validation resolves an omitted visibility to `PRIVATE`; update validation continues to receive the route-merged current stored visibility. In `AdminLeagueDesk`, initialise and reset `newVisibility` to `PRIVATE`. Do not add a database migration or change `editVisibility` initialisation.

- [ ] **Step 4: Run the private-default tests to verify GREEN**

Run: `npm test -- tests/domain/league.test.ts tests/server/league-routes.test.ts tests/client/app-league-create.test.tsx`

Expected: PASS; explicit Public creation works and existing stored season visibility remains unchanged.

- [ ] **Step 5: Write the failing admin tab and hierarchy tests**

```tsx
it('uses accessible season-admin tabs and exposes club access without a hidden mobile strip', async () => {
  render(<AdminLeagueDesk user={admin} selectedLeagueId="league-1" />);
  const tabs = await screen.findByRole('tablist', { name: 'Season admin tasks' });
  const season = within(tabs).getByRole('tab', { name: 'Season' });

  expect(season.getAttribute('aria-selected')).toBe('true');
  fireEvent.keyDown(season, { key: 'End' });
  expect(screen.getByRole('tab', { name: 'Club access' }).getAttribute('aria-selected')).toBe('true');
  expect(screen.getByRole('tabpanel', { name: 'Club access' })).toBeTruthy();
});

it('starts a new season private and leaves an existing public season public until saved otherwise', async () => {
  render(<AdminLeagueDesk user={admin} selectedLeagueId="league-1" />);
  const disclosure = await screen.findByText('Create a new season');
  fireEvent.click(disclosure);
  expect((screen.getByLabelText('Visibility') as HTMLSelectElement).value).toBe('PRIVATE');
  expect(screen.getByText('Current season: Misfits 501 · 2026 · Open · Public')).toBeTruthy();
});
```

- [ ] **Step 6: Run the admin tab and hierarchy tests to verify RED**

Run: `npm test -- tests/client/player-app.test.tsx tests/client/app-league-create.test.tsx`

Expected: FAIL because buttons use `aria-current`, `People` is the label, creation is open, and no current-season context exists.

- [ ] **Step 7: Implement explicit task tabs**

Replace the `nav` of ordinary buttons with a `role="tablist"` labelled `Season admin tasks`. Give each tab an ID, `aria-controls`, `aria-selected`, and roving keyboard selection for `ArrowLeft`, `ArrowRight`, `Home`, and `End`. Give every matching panel `role="tabpanel"`, matching ID, and `aria-labelledby`. Make `Club access` the final label and include its whole-club scope sentence.

- [ ] **Step 8: Make current-season work first and creation deliberate**

Render the season picker and explicit current-season context before the selected season settings. Move the complete creation form below those settings inside a native `details.create-season-disclosure` whose summary text is exactly `Create a new season`. Relabel fields as `Club name`, `Season`, `Player capacity`, `Games per pair`, `Target legs`, and `Points per win`; use `fieldset`/`legend` groups for identity, rules, and access.

- [ ] **Step 9: Clarify routine jobs without changing their behaviour**

Rename the results heading to `Record a result`. Keep its request/validation path unchanged. Keep share available only for a selected public season. Preserve all invitation, member status, role, and result queue operations.

- [ ] **Step 10: Apply responsive task and form CSS**

At phone width use a two-column `.admin-tabs` grid with no horizontal overflow. At desktop retain the sticky left rail. Keep 44px controls, correct focus outlines, normal fieldset styling, and no dashboard-card presentation.

- [ ] **Step 11: Run focused tests to verify GREEN**

Run: `npm test -- tests/client/player-app.test.tsx tests/client/app-league-create.test.tsx tests/client/league-switch-race.test.tsx`

Expected: PASS; changing the selected admin season still does not replace the independently selected member season.

- [ ] **Step 12: Commit the Season admin change**

```powershell
git add -- src/client/components/AdminLeagueDesk.tsx src/client/styles.css src/server/domain/league.ts tests/client/player-app.test.tsx tests/client/app-league-create.test.tsx tests/domain/league.test.ts tests/server/league-routes.test.ts
git commit -m "feat: make Misfits season admin operational"
```

### Task 5: Complete the visual-system craft pass

**Files:**
- Modify: `src/client/styles.css`
- Modify: `src/client/App.tsx`
- Modify: `src/client/components/AdminLeagueDesk.tsx`

**Interfaces:**
- Consumes: semantic classes from Tasks 1–4.
- Produces: the single Weekly Ledger visual world consistently across public, member, and admin surfaces.

- [ ] **Step 1: Add a failing structural/browser check before visual polish**

Create `tests/client/weekly-ledger-structure.test.tsx` using real components and assert the observable contracts that styling must not hide: the one named logo, public H1, labelled table, one active admin tab, and all four visible task controls.

- [ ] **Step 2: Run it to verify RED**

Run: `npm test -- tests/client/weekly-ledger-structure.test.tsx`

Expected: FAIL until the completed Tasks 1–4 outputs are present; if it already passes, strengthen it with a missing consumer-visible behaviour rather than proceeding on an empty RED phase.

- [ ] **Step 3: Implement the stylesheet consolidation**

Replace legacy poster styles with a compact tokenised system: paper/ink/rule/red variables; line-height and measure rules; table overflow isolated to `.standings-table-wrap`; tabular numerals; selection, caret, scrollbar, and underline styling; hover/disabled/empty/error/loading states; and one restrained public intro reveal. Do not use gradients, giant type, repeated artwork, coloured metric cards, decorative kicker labels, or pill navigation.

- [ ] **Step 4: Run the structural test to verify GREEN**

Run: `npm test -- tests/client/weekly-ledger-structure.test.tsx`

Expected: PASS with no legacy poster content, hidden admin task, or missing accessible record structure.

- [ ] **Step 5: Run the Impeccable source detector**

Run: `node .agents/skills/impeccable/scripts/detect.mjs --json src/client`

Expected: `[]`, or explicitly triage every finding before proceeding.

- [ ] **Step 6: Commit the visual-system pass**

```powershell
git add -- src/client/styles.css src/client/App.tsx src/client/components/AdminLeagueDesk.tsx tests/client/weekly-ledger-structure.test.tsx
git commit -m "style: refine Misfits weekly ledger"
```

### Task 6: Verify, review, publish, and observe the deployed result

**Files:**
- Modify only if verification exposes a real defect: the smallest relevant file(s) above and their failing regression test(s).

**Interfaces:**
- Consumes: the completed client build, GitHub branch, existing CI workflow, and Cloudflare deployment workflow.
- Produces: evidence that distinguishes local validation, pushed-branch CI, and production runtime observation.

- [ ] **Step 1: Run complete static and automated validation**

Run:

```powershell
npm test
npm run typecheck
npm run build
node .agents/skills/impeccable/scripts/detect.mjs --json src/client
git diff --check
```

Expected: all commands exit 0; detector is clean or has documented, resolved findings.

- [ ] **Step 2: Run the built application locally**

Run: `npm run dev -- --host 127.0.0.1`

Open the local URL in the controlled browser and inspect public 320px, 390px, and desktop viewports. Check one logo, readable copy, semantic table, no horizontal document overflow, visible controls, selection/focus, and no console errors.

- [ ] **Step 3: Conduct independent final review passes**

Use one visual reviewer and one usability/accessibility reviewer against the local build. Consolidate only confirmed issues into one correction pass. For every defect, write a failing test first when the behaviour is testable, then repeat the focused and complete verification.

- [ ] **Step 4: Commit and push the verified branch**

```powershell
git status --short
git log --oneline origin/codex/implement-misfits-club-v4..HEAD
git push origin codex/implement-misfits-club-v4
```

Observe the branch's GitHub Actions run to completion; record the commit SHA and CI result.

- [ ] **Step 5: Deploy through the existing protected production path and inspect it live**

The existing workflow deploys on `main`. Integrate only the verified redesign commit through the repository's normal main-branch process, observe the production deploy, then inspect `https://darts.graingers.agency/` at 320px, 390px, and desktop. Record the deployed SHA, public page geometry, console state, and any authenticated-flow proof boundary.

- [ ] **Step 6: Produce the final evidence report**

Report separately: source tests/typecheck/build/detector, local visual observation, pushed-branch SHA/CI, production deploy SHA, live public observation, and any authenticated production checks that could not be exercised without a user session.
