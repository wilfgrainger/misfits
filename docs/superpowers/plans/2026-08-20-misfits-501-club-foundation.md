# Misfits 501 Club Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the repository unambiguously one-club Misfits 501, apply the three verified PR review fixes, and establish a luxury/pristine product shell with honest Cloudflare free-tier and Google-auth operating guidance.

**Architecture:** Keep the existing single Cloudflare Worker, D1 database, Vite/React static asset deployment, and Google Identity Services flow. Separate the administrator's club-wide league desk selection from the player's personal workspace selection, retain Worker-side authorization, and document unresolved membership/fixture decisions instead of inventing them.

**Tech Stack:** TypeScript, React, Hono, Cloudflare Workers Static Assets, D1, Vite, Vitest, Google Identity Services.

**Spec:** `docs/superpowers/specs/2026-08-20-misfits-501-club-v4-design.md`

## Global Constraints

- Misfits 501 is the only club and the product identity; do not restore white-label tenancy or player-owned league administration.
- Use one Worker, static assets, and one D1 database; no paid Cloudflare dependency is part of the core path.
- Google Identity Services is the only sign-in method; secrets stay in Wrangler/`.dev.vars`, never in source.
- DartCounter remains the scoring surface; this application records league data and does not become a live scorer.
- Do not invent match-night, season, postponement, WhatsApp, or social-link values that the v4 design leaves open.
- Preserve server-side authentication, authorization, privacy, same-origin mutation checks, audit records, accessibility, and existing API compatibility.
- Follow Cave Pony: reuse current helpers, avoid speculative schema/features, and prove each behavior change with the smallest decisive test.

---

### Task 1: Product authority, agent contract, and free-tier runbook

**Files:**
- Create: `AGENTS.md`
- Create: `docs/operations/cloudflare-free-tier-runbook.md`
- Create: `docs/superpowers/plans/2026-08-20-misfits-501-club-foundation.md`
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-08-20-misfits-501-club-v4-design.md`

**Interfaces:**
- Produces the repository operating contract for future agents and the release checklist used before Wrangler deployment.
- Does not add a runtime API, dependency, database table, scheduled job, queue, object store, or secret.

- [x] **Step 1: Write the authoritative documentation**

`AGENTS.md` must state the source-of-truth hierarchy, one-club/luxury UI rules, Google and Cloudflare boundaries, test-first workflow, safe migration rules, and the commands agents must run. The free-tier runbook must distinguish current measured usage from Cloudflare limits and link to the official limits pages.

- [x] **Step 2: Update the public product contract**

Update `README.md` and the v4 design so they say “luxury, pristine Misfits 501 club UI,” remove claims that are not yet implemented, identify the current foundation slice, and list membership requests, fixtures, archives, bios, socials, and statistics as gated follow-on work with their open club decisions.

- [x] **Step 3: Verify documentation consistency**

Run:

```bash
rg -n "white-label|League Board|player-created|free-tier|Google Identity|luxury|pristine|Cave Pony" AGENTS.md README.md docs/superpowers/specs/2026-08-20-misfits-501-club-v4-design.md docs/operations/cloudflare-free-tier-runbook.md
```

Expected: no current-product wording presents white-label or player-owned administration as active; Google, one-club, luxury/pristine, and free-tier rules are explicit.

- [x] **Step 4: Commit**

```bash
git add AGENTS.md README.md docs/operations/cloudflare-free-tier-runbook.md docs/superpowers/plans/2026-08-20-misfits-501-club-foundation.md docs/superpowers/specs/2026-08-20-misfits-501-club-v4-design.md
git commit -m "docs: define Misfits club operating contract"
```

### Task 2: Separate administrator and player league selection

**Files:**
- Modify: `src/client/App.tsx`
- Test: `tests/client/app-league-create.test.tsx`

**Interfaces:**
- `AdminLeagueDesk.selectedLeagueId` becomes the administrator desk selection.
- `App` keeps `selectedLeagueId` exclusively for the player's own league tabs and passes a separate `adminSelectedLeagueId` to the desk.

- [ ] **Step 1: Write the failing regression test**

Add an admin-only league to the test fixture and render an administrator whose `myLeagues` contains only the player league. Click the admin desk's admin-only league and assert that the player table remains the original table:

```tsx
it('keeps admin desk selection separate from player workspace selection', async () => {
  state.user.role = 'ADMIN';
  state.myLeagues = [createdLeague];
  state.adminLeagues = [createdLeague, adminOnlyLeague];
  render(<App />);

  await waitFor(() => expect(screen.getByLabelText('Tuesday Club table')).toBeTruthy());
  fireEvent.click(within(screen.getByRole('region', { name: 'League desk' })).getByRole('button', { name: /Thursday Club/ }));

  await waitFor(() => expect(screen.getByRole('heading', { name: 'Manage Thursday Club' })).toBeTruthy());
  expect(screen.getByLabelText('Tuesday Club table')).toBeTruthy();
  expect(screen.queryByLabelText('Thursday Club table')).toBeNull();
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npx vitest run tests/client/app-league-create.test.tsx -t "keeps admin desk selection separate"`

Expected: FAIL because the current App writes the admin desk selection into the player `selectedLeagueId`.

- [ ] **Step 3: Implement the smallest state separation**

Add `adminSelectedLeagueId` state, reset it on logout, pass it to `AdminLeagueDesk`, and update only that state in `onLeagueSelected`. Keep `selectedLeagueId` and its membership validity effect for the player workspace. When an administrator creates a league, initialize both selections because the existing server behavior makes the creator an active member.

- [ ] **Step 4: Run focused and existing client tests**

Run: `npx vitest run tests/client/app-league-create.test.tsx`

Expected: PASS with the selection regression covered and the existing administration visibility checks green.

- [ ] **Step 5: Commit**

```bash
git add src/client/App.tsx tests/client/app-league-create.test.tsx
git commit -m "fix: separate admin and player league workspaces"
```

### Task 3: Give every active administrator People controls

**Files:**
- Modify: `src/client/components/AdminLeagueDesk.tsx`
- Test: `tests/client/account-profile.test.tsx`

**Interfaces:**
- The existing server routes remain the authorization boundary.
- Any active `UserSummary` with `role === 'ADMIN'` may load and see the existing People controls; `isMasterAdmin` remains data for master-account protections, not a UI gate.

- [ ] **Step 1: Write the failing test**

Render a promoted administrator with `isMasterAdmin: false`, return one `AdminPlayer` from the mock `adminPlayers()` call, and assert that the People section and role action are present:

```tsx
it('shows People controls to promoted administrators', async () => {
  user.isMasterAdmin = false;
  render(<App />);

  await waitFor(() => expect(screen.getByRole('heading', { name: 'People' })).toBeTruthy());
  expect(screen.getByRole('button', { name: 'Make admin' })).toBeTruthy();
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npx vitest run tests/client/account-profile.test.tsx -t "promoted administrators"`

Expected: FAIL because `AdminLeagueDesk` currently gates People on `isMasterAdmin`.

- [ ] **Step 3: Change the UI gate only**

Use `user.role === 'ADMIN'` for the `adminPlayers()` load and People section render. Do not weaken the Worker route guard or remove master/last-admin protections in `src/server/db/admin.ts`.

- [ ] **Step 4: Run the focused test and full client suite**

Run: `npx vitest run tests/client/account-profile.test.tsx tests/client/app-league-create.test.tsx`

Expected: PASS with master and promoted administrator coverage.

- [ ] **Step 5: Commit**

```bash
git add src/client/components/AdminLeagueDesk.tsx tests/client/account-profile.test.tsx
git commit -m "fix: expose club People controls to administrators"
```

### Task 4: Remove retired ownership from personal league lists

**Files:**
- Modify: `src/server/db/leagues.ts`
- Test: `tests/server/league-routes.test.ts`

**Interfaces:**
- `listUserLeagues(db, userId)` returns only leagues with an active `league_players` row for `userId`.
- No route, response shape, or public privacy rule changes.

- [ ] **Step 1: Write the failing server regression test**

Mark the legacy creator's membership inactive while leaving `leagues.created_by` unchanged, call `/api/me/leagues`, and assert that the inaccessible league is absent:

```ts
it('lists personal leagues by active membership, not retired ownership', async () => {
  const { db, env, publicRoutes } = setup();
  db.inactiveMemberships.add('league-private:player-2');
  const response = await publicRoutes.fetch(new Request('https://misfits.test/api/me/leagues', {
    headers: { Cookie: await cookieFor(db, 'player-2') },
  }), env, {} as never);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ leagues: [] });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npx vitest run tests/server/league-routes.test.ts -t "retired ownership"`

Expected: FAIL because the current SQL includes `leagues.created_by = ?`.

- [ ] **Step 3: Replace the ownership fallback with an active-membership join**

Use `JOIN league_players` with `league_players.user_id = ? AND league_players.active = 1`; keep the existing ordering and selected columns. This is safe because newly created leagues already insert the creator as an active member.

- [ ] **Step 4: Run focused server tests and the complete suite**

Run: `npx vitest run tests/server/league-routes.test.ts`

Expected: PASS with no regression in private league reads, invite joins, capacity, or admin management.

- [ ] **Step 5: Commit**

```bash
git add src/server/db/leagues.ts tests/server/league-routes.test.ts
git commit -m "fix: derive personal leagues from active membership"
```

### Task 5: Apply the one-club luxury/pristine shell

**Files:**
- Modify: `src/client/App.tsx`
- Modify: `src/client/styles.css`
- Modify: `index.html`
- Modify: `public/manifest.webmanifest`
- Modify: `tests/client/account-profile.test.tsx`
- Modify: `tests/client/platform-assets.test.ts`

**Interfaces:**
- Keep the current accessible DOM structure and API calls.
- Preserve the supplied `public/brand/misfits-501.jpg` asset; do not crop it into a destructive circular logo treatment.

- [ ] **Step 1: Write/update failing UI identity assertions**

Assert that the signed-in shell uses the final Misfits club language and that metadata describes a private club, not a generic league board:

```tsx
expect(screen.getByRole('heading', { name: /beautifully settled/i })).toBeTruthy();
expect(screen.getByText('THE MISFITS 501 CLUB')).toBeTruthy();
```

```ts
expect(readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')).toContain('luxury private-club darts league');
```

- [ ] **Step 2: Run the focused tests to verify the old copy fails**

Run: `npx vitest run tests/client/account-profile.test.tsx tests/client/platform-assets.test.ts`

Expected: FAIL until the final product copy and metadata are changed.

- [ ] **Step 3: Implement the visual and copy direction**

Use a restrained obsidian/ivory/dart-red palette, generous spacing, crisp table/form surfaces, restrained borders, visible focus, no distressed texture, and no generic white-label language. Keep the club mark prominent but uncropped in the identity panel. Update the hero, sign-in, league, and admin headings to speak as Misfits 501, not a platform.

- [ ] **Step 4: Run focused tests and production checks**

Run:

```bash
npx vitest run tests/client/account-profile.test.tsx tests/client/platform-assets.test.ts
npm run typecheck
npm test
npm run build
```

Expected: all commands exit 0; no private data or authorization test changes are needed for a CSS/copy-only update.

- [ ] **Step 5: Commit**

```bash
git add src/client/App.tsx src/client/styles.css index.html public/manifest.webmanifest tests/client/account-profile.test.tsx tests/client/platform-assets.test.ts
git commit -m "style: establish the Misfits luxury club shell"
```

### Final verification gate

- [ ] Re-read the v1, v2, v3, and v4 specs and confirm current product wording only treats v4 as authority; historical specs are labelled historical.
- [ ] Run `npm test`, `npm run typecheck`, `npm run build`, `npx wrangler types`, and `npx wrangler deploy --dry-run`.
- [ ] Run a Cave Pony review of the diff: identify overbuild, missing proof, security/privacy regressions, and any invented club rules; action only findings supported by the v4 authority.
- [ ] Run a Cloudflare Worker review: verify binding names, static asset routing, no paid services, no floating promises, no secrets in source, and current free-tier runbook links.
- [ ] Inspect `git diff --check` and `git status --short` before reporting results.
