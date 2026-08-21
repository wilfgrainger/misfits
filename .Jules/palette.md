## 2026-08-21 - Accessible Async Buttons and Pure Surface Hierarchy

**Learning:** Combining `aria-busy` with dynamic button text ("Saving", "Creating") communicates async progress to screen readers and visual users simultaneously without layout jitter. Additionally, avoid artificial side-border pseudo-elements (like 3px colored stripes on active cards) as they signal generic AI-generated aesthetics; rely instead on elevated surface styling (`--surface-3`) and subtle inset borders for active selection states.

**Action:** Always pair `aria-busy={isPending}` with text updates on form submit buttons, and use clean inset box-shadow borders for active item selection in list pickers.

## 2026-08-21 - Onboarding Context & Tab Panel Motion

**Learning:** When onboarding first-time users, explaining where their nickname appears ("on the club table and match results") reduces hesitance during registration. For panel transitions, subtle vertical translation (4px) paired with fade-in inside `@media (prefers-reduced-motion: no-preference)` delivers tactile motion without triggering motion sensitivity.

**Action:** Always provide context for profile setup inputs and wrap non-essential UI animations inside `prefers-reduced-motion: no-preference` media queries.
