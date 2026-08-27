# Misfits 501 Premium Club V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a cohesive, mobile-first premium club redesign for Misfits 501 while retaining every current private-access, results, standings, fixture, and admin contract.

**Architecture:** Keep application and API ownership unchanged. `App.tsx` continues to select the secure lifecycle state; existing member, league, public-view, and admin components keep their data-flow boundaries. The implementation introduces presentation-only semantic hooks and a coherent CSS system across the existing client surfaces.

**Tech Stack:** React 19, TypeScript, Vite, Vitest + Testing Library, vanilla CSS, Cloudflare Worker/D1 (unchanged).

**Spec:** `docs/superpowers/specs/2026-08-27-premium-club-v2-design.md`

## Global Constraints

- Keep the product a single private club: no anonymous member/competition data, self-service membership, live scoring, or multi-club support.
- Preserve Google-only authentication, Worker authorization, routes, server code, migrations, and D1 schema.
- Preserve `Home`, `Record`, `Leagues`, and `More` as the sole global member destinations; retain local `Table`, `Fixtures`, `Results` tabs.
- Keep `public/brand/misfits-501.jpg` intact; add no image, external font, dependency, endpoint, migration, or Cloudflare resource.
- Use Misfits red for normal interaction, green only for positive semantic status, 44px practical member touch targets, clear focus, reduced-motion support, and no horizontal overflow at 320/360/375/390/412/430/768/1024+ widths.

---

## File structure

| Path | Responsibility |
| --- | --- |
| `index.html` | Emits the V2 visual-direction contract as the first child of the document body. |
| `src/client/App.tsx` | Secure view-state selection and refined private entrance/admission semantics. |
| `src/client/private-club.css` | Private entrance, membership, public record, and shell presentation. |
| `src/client/club-app.css` | Member home, navigation, competition workspace, and More presentation. |
| `src/client/mobile-experience.css` | Phone table, safe-area navigation clearance, and responsive overrides. |
| `src/client/styles.css` | Existing shared table, fixture, result, and admin record selectors only. |
| `src/client/components/MemberApp.tsx` | Semantic grouping hooks for existing member destinations. |
| `src/client/components/MemberNavigation.tsx` | Existing four destinations with stable presentation hooks. |
| `src/client/components/PublicLeagueView.tsx` | Public record layout hooks with unchanged public payload. |
| `tests/client/private-club-entry.test.tsx` | Secure entrance and no-data regression contract. |
| `tests/client/member-navigation.test.tsx` | Club-first global navigation and competition-local tabs. |
| `tests/client/public-app-ux.test.tsx` | Public-table presentation and privacy semantics. |
| `tests/client/responsive-widths.test.ts` | Width, focus, motion, and safe-area source contracts. |

### Task 1: Define V2’s protected UI contracts

**Files:**

- Modify: `tests/client/private-club-entry.test.tsx`
- Modify: `tests/client/member-navigation.test.tsx`
- Modify: `tests/client/public-app-ux.test.tsx`

**Interfaces:**

- Consumes: existing `App`, `MemberApp`, `MemberNavigation`, and mocked `ApiClient`.
- Produces: presentation-contract tests that implementation tasks use to protect privacy and club-first IA.

- [ ] **Step 1: Write the failing secure-entrance test**

~~~tsx
it('presents the club promise and admission card without mounting protected club data', async () => {
  meResult = () => Promise.reject(new ApiClientError(401, 'Unauthenticated'));
  render(<App />);

  expect(await screen.findByText('Club darts, properly settled.')).toBeTruthy();
  expect(screen.getByRole('group', { name: 'Sign in with Google' })).toBeTruthy();
  expect(screen.getByText(/League tables, results and member details stay private/i)).toBeTruthy();
  expect(screen.queryByText('Your competitions')).toBeNull();
  expect(calls.leagues).toBe(0);
  expect(calls.myLeagues).toBe(0);
});
~~~

- [ ] **Step 2: Run it to verify it fails**

Run: `./node_modules/.bin/vitest run tests/client/private-club-entry.test.tsx --reporter=verbose`

Expected: FAIL because the V2 entrance semantic contract is not yet rendered.

- [ ] **Step 3: Write the failing club-first navigation assertions**

~~~tsx
expect(screen.getAllByRole('button', { name: /^(Home|Record|Leagues|More)$/ })
  .map((button) => button.textContent))
  .toEqual(['Home', 'Record', 'Leagues', 'More']);
expect(screen.queryByRole('button', { name: 'Fixtures' })).toBeNull();

fireEvent.click(screen.getByRole('button', { name: 'Leagues' }));
fireEvent.click(await screen.findByRole('button', { name: /Misfits 501/i }));
expect(screen.getByRole('tablist', { name: /Misfits 501 views/i })).toBeTruthy();
~~~

- [ ] **Step 4: Run the focused contract tests**

Run: `./node_modules/.bin/vitest run tests/client/member-navigation.test.tsx tests/client/public-app-ux.test.tsx --reporter=verbose`

Expected: existing flow contracts pass; new V2 expectations fail before their implementation.

- [ ] **Step 5: Commit**

~~~bash
git add tests/client/private-club-entry.test.tsx tests/client/member-navigation.test.tsx tests/client/public-app-ux.test.tsx
git commit -m "test: define premium club v2 contracts"
~~~

### Task 2: Build the private-club threshold

**Files:**

- Modify: `index.html`
- Modify: `src/client/App.tsx`
- Modify: `src/client/private-club.css`
- Modify: `tests/client/private-club-entry.test.tsx`

**Interfaces:**

- Consumes: `ViewState`, `clubInviteToken`, existing `ClubShell`, `googleSlot`, and secure `ApiClient` state transitions.
- Produces: `private-entry-masthead` and `private-admission-card` hooks without any lifecycle/API change.

- [ ] **Step 1: Run the Task 1 red test**

Run: `./node_modules/.bin/vitest run tests/client/private-club-entry.test.tsx --reporter=verbose`

Expected: FAIL only on new V2 structure/promise expectations.

- [ ] **Step 2: Replace the timed entrance with readable static structure**

In `index.html`, add the V2 direction contract as the first child of `body`, using an HTML comment whose first token is `premium-club-v2`. It must include the exact five short blocks `THESIS`, `OWN-WORLD`, `STORY`, `FIRST VIEWPORT`, and `FINISH`, and end with `unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance`. In `App.tsx`, remove `FRONT_PAGE_INTRO_DURATION`, `frontPageIntroSeen`, `frontPageIntroActive`, and their `useLayoutEffect`. Preserve message selection, unavailable-league handling, invitation handling, `googleSlot`, sign-in logic, and privacy note. Render the signed-out view in this semantic order:

~~~tsx
<section className="private-entry-state private-signin-state private-entry-v2">
  <div className="private-entry-masthead">
    <p className="entry-kicker">Private members club</p>
    <h1>Misfits 501</h1>
    <p className="entry-promise">Club darts, properly settled.</p>
  </div>
  <div className="private-admission-card" role="group" aria-label="Sign in with Google">
    {/* Existing invite/unavailable-specific heading, copy, and googleSlot */}
  </div>
  {/* Existing error/status message and privacy note */}
</section>
~~~

Put invitation-specific title/copy in the card so `/join/:token` still explains request and approval. Preserve the `League unavailable` alternative exactly. Never call a league endpoint from this branch.

- [ ] **Step 3: Implement the entrance styling**

In `private-club.css`, create a single-column phone layout on an ink ground with a subtle CSS radial glow, fine red registration-line treatment, warm masthead, and raised admission card. Use `min-height: 100dvh`, `padding: clamp(1.25rem, 5vw, 3.5rem)`, full usable Google-button width, and a `prefers-reduced-motion` fallback. At `min-width: 768px`, form a balanced two-column composition without using the JPEG as a background.

- [ ] **Step 4: Run the entrance suite**

Run: `./node_modules/.bin/vitest run tests/client/private-club-entry.test.tsx --reporter=verbose && npm run build && rg -n "premium-club-v2" dist`

Expected: PASS; invitation, pending, rejected, suspended, onboarding, and anonymous no-data contracts remain green; the built HTML includes the visual-direction comment.

- [ ] **Step 5: Commit**

~~~bash
git add index.html src/client/App.tsx src/client/private-club.css tests/client/private-club-entry.test.tsx
git commit -m "feat: build premium private club entrance"
~~~

### Task 3: Build the club record-book member shell

**Files:**

- Modify: `src/client/components/MemberApp.tsx`
- Modify: `src/client/components/MemberNavigation.tsx`
- Modify: `src/client/club-app.css`
- Modify: `tests/client/member-navigation.test.tsx`

**Interfaces:**

- Consumes: `MemberDestination`, existing `openCompetition`, `openPendingReview`, `selectDestination`, and all existing result-routing handlers.
- Produces: `club-home-primary`, `club-home-attention`, `competition-record`, and `club-member-nav` presentation hooks only.

- [ ] **Step 1: Write the failing member-shell test**

~~~tsx
expect(screen.getByRole('navigation', { name: 'Member workspace' })).toHaveClass('club-member-nav');
expect(screen.getByRole('heading', { name: /Good to see you/i })).toBeTruthy();
expect(screen.getByRole('heading', { name: 'Your competitions' })).toBeTruthy();
expect(screen.getByRole('heading', { name: 'Needs you' })).toBeTruthy();
~~~

- [ ] **Step 2: Run the focused member test**

Run: `./node_modules/.bin/vitest run tests/client/member-navigation.test.tsx --reporter=verbose`

Expected: FAIL only on V2 hook assertions.

- [ ] **Step 3: Add semantic grouping without changing behaviour**

In `MemberApp.tsx`, preserve every existing heading, button label, data request, `MemberDestination`, record decision, and local-tab role. Add V2 classes to the existing Home competition/attention regions instead of a new navigation or extra API call. In `MemberNavigation.tsx`, preserve the exact destinations array and `aria-current` selected state.

- [ ] **Step 4: Implement the member-shell CSS**

In `club-app.css`, use 16–20px phone gutters, a compact header, controlled heading scale, thin dividers, and raised surfaces only for real competition/task units. At desktop, lay Home out as `minmax(0, 1.2fr) minmax(18rem, .8fr)` with source order unchanged. Keep local workspace tabs compact; do not introduce a league hero. Use red for active nav/tab/focus and semantic colours for states only.

- [ ] **Step 5: Run the member workflow tests**

Run: `./node_modules/.bin/vitest run tests/client/member-navigation.test.tsx tests/client/player-app.test.tsx --reporter=verbose`

Expected: PASS; all global destinations, task-first Record, and local competition workspace contracts remain intact.

- [ ] **Step 6: Commit**

~~~bash
git add src/client/components/MemberApp.tsx src/client/components/MemberNavigation.tsx src/client/club-app.css tests/client/member-navigation.test.tsx
git commit -m "feat: shape member workspace as club record book"
~~~

### Task 4: Unify public, table, fixture, result, and admin records

**Files:**

- Modify: `src/client/components/PublicLeagueView.tsx`
- Modify: `src/client/private-club.css`
- Modify: `src/client/styles.css`
- Modify: `src/client/mobile-experience.css`
- Modify: `tests/client/public-app-ux.test.tsx`
- Modify: `tests/client/standings-table.test.tsx`

**Interfaces:**

- Consumes: `PublicLeagueView` props, `PublicFixtureSummary`, existing status class names, and PlayerLeague/AdminCompetitionDesk markup.
- Produces: scorebook visual treatment only; no payload, route, scoring, or permission change.

- [ ] **Step 1: Write the failing public-record test**

~~~tsx
expect(screen.getByRole('heading', { name: league.name })).toBeTruthy();
expect(screen.getByText('Public fixture board')).toBeTruthy();
expect(screen.getByText(/Only the club's deliberately public fixture schedule/i)).toBeTruthy();
expect(screen.queryByText('Join the')).toBeNull();
~~~

- [ ] **Step 2: Run the focused public/table tests**

Run: `./node_modules/.bin/vitest run tests/client/public-app-ux.test.tsx tests/client/standings-table.test.tsx --reporter=verbose`

Expected: existing public/data contracts pass; a new presentation hook expectation fails if required.

- [ ] **Step 3: Add presentation hooks sparingly**

In `PublicLeagueView.tsx`, retain all headings, fixture detail, load failure, empty state, and privacy note. Add record-header/rules/list classes only when current selectors cannot express the intended layout. Never add invitations, public player data, or visibility-changing links.

- [ ] **Step 4: Implement the scorebook system**

Use `styles.css` and `private-club.css` to make standings, fixtures, result feed, and admin work read as dense club records: compact round metadata, tabular figures, points as strongest table value, thin separators, explicit status text, and a restrained current row. In `mobile-experience.css`, retain `POS | PLAYER | P | W-D-L | PTS`; progressively disclose legs/averages rather than squeezing columns. Keep admin task order and API calls untouched.

- [ ] **Step 5: Run public/data workflows**

Run: `./node_modules/.bin/vitest run tests/client/public-app-ux.test.tsx tests/client/standings-table.test.tsx tests/client/player-app.test.tsx --reporter=verbose`

Expected: PASS; public data remains deliberately limited and result workflow semantics remain unchanged.

- [ ] **Step 6: Commit**

~~~bash
git add src/client/components/PublicLeagueView.tsx src/client/private-club.css src/client/styles.css src/client/mobile-experience.css tests/client/public-app-ux.test.tsx tests/client/standings-table.test.tsx
git commit -m "feat: unify club record surfaces"
~~~

### Task 5: Protect responsive, focus, and motion rules

**Files:**

- Modify: `tests/client/responsive-widths.test.ts`
- Modify: `src/client/club-app.css`
- Modify: `src/client/private-club.css`
- Modify: `src/client/mobile-experience.css`

**Interfaces:**

- Consumes: established CSS files and responsive test helpers.
- Produces: source-level evidence for V2 widths, safe-area clearance, focus, and reduced-motion support.

- [ ] **Step 1: Write failing responsive assertions**

~~~ts
expect(css).toMatch(/@media \(max-width: 680px\)/);
expect(css).toMatch(/padding-bottom:\s*calc\([^)]*env\(safe-area-inset-bottom\)/);
expect(css).toMatch(/\.club-member-nav.*min-height:\s*44px/s);
expect(privateCss + '\n' + clubCss).toMatch(/@media \(prefers-reduced-motion:\s*reduce\)/);
expect(privateCss + '\n' + clubCss + '\n' + mobileCss).toMatch(/overflow-x:\s*hidden/);
~~~

- [ ] **Step 2: Run the responsive red test**

Run: `./node_modules/.bin/vitest run tests/client/responsive-widths.test.ts --reporter=verbose`

Expected: FAIL only where V2 source safeguards are still absent.

- [ ] **Step 3: Implement smallest real safeguards**

Add content clearance above the fixed phone navigation, usable Google-control containment, `min-width: 0` for text/table grid children, and one red `:focus-visible` system for buttons, links, inputs, and tabs. Solve overflow by correct layout sizing, not arbitrary clipping.

- [ ] **Step 4: Run responsive and privacy tests**

Run: `./node_modules/.bin/vitest run tests/client/responsive-widths.test.ts tests/client/private-club-entry.test.tsx --reporter=verbose`

Expected: PASS across protected entry and all required width rules.

- [ ] **Step 5: Commit**

~~~bash
git add tests/client/responsive-widths.test.ts src/client/club-app.css src/client/private-club.css src/client/mobile-experience.css
git commit -m "test: protect premium club responsive design"
~~~

### Task 6: Validate, render, and finish the V2 release

**Files:**

- Create: `.impeccable/review/mobile.png`
- Create: `.impeccable/review/desktop.png`
- Modify: relevant Task 2–5 sources only if one batched visual correction is required
- Modify: `DESIGN.md` and `PROGRESS.md` only when the final release genuinely changes durable visual or handoff truth

**Interfaces:**

- Consumes: completed V2 client surface, test contracts, local development server, and existing Impeccable context.
- Produces: accurate source/build/render evidence only; it does not claim deployment or an authenticated Google journey unless observed.

- [ ] **Step 1: Run TypeScript and all focused V2 contracts**

Run:

~~~bash
npm run typecheck
./node_modules/.bin/vitest run tests/client/private-club-entry.test.tsx tests/client/member-navigation.test.tsx tests/client/public-app-ux.test.tsx tests/client/standings-table.test.tsx tests/client/responsive-widths.test.ts --reporter=verbose
~~~

Expected: PASS.

- [ ] **Step 2: Build production output**

Run: `npm run build`

Expected: PASS and emit the Vite production bundle.

- [ ] **Step 3: Capture two valid private-entrance renders**

Run: `npm run dev -- --host 127.0.0.1`

After a successful compile, use the in-app browser at 390px and 1440px to capture the private root route in `.impeccable/review/mobile.png` and `.impeccable/review/desktop.png`. Confirm both captures show the intended route, readable sign-in control, and no blank/partial frame. Do not authenticate or claim a signed-in journey unless actually observed.

- [ ] **Step 4: Make at most one batched visual correction pass**

Compare both captures against the approved spec for admission clarity, contrast, scale, mobile nav clearance, table compression, focus visibility, and overflow. If material defects exist, correct only the relevant Task 2–5 files, rerun their focused tests/build, recapture the same files, and stop after the second review round.

- [ ] **Step 5: Run the static and full release gate**

Run:

~~~bash
node .agents/skills/impeccable/scripts/detect.mjs --json src/client
npx wrangler types
npm test
npm run build
git diff --check
~~~

Expected: detector has no unaddressed mechanical issue; types, full suite, build, and diff check PASS. If the full suite exceeds the environment window, retain the exact incomplete output and report it as unverified.

- [ ] **Step 6: Run simplicity and documentation handoff**

Review the completed diff for duplicate selectors, abandoned timed-intro code, needless wrapper markup, and new dependencies. Run the required Cave Pony simplicity pass. Update `DESIGN.md` only if the shipped visual world materially replaces durable rules; update `PROGRESS.md` only with actual branch/verification/handoff facts.

- [ ] **Step 7: Commit exact final changes**

~~~bash
git add src/client tests/client .impeccable/review
git add DESIGN.md PROGRESS.md
git commit -m "feat: complete premium club v2"
~~~

Do not stage a missing path or unrelated checkout content; if DESIGN.md or PROGRESS.md did not change, omit it from the command.
