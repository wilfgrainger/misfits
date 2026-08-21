## 2026-08-21 - Accessible Async Buttons and Pure Surface Hierarchy

**Learning:** Combining `aria-busy` with dynamic button text ("Saving", "Creating") communicates async progress to screen readers and visual users simultaneously without layout jitter. Additionally, avoid artificial side-border pseudo-elements (like 3px colored stripes on active cards) as they signal generic AI-generated aesthetics; rely instead on elevated surface styling (`--surface-3`) and subtle inset borders for active selection states.

**Action:** Always pair `aria-busy={isPending}` with text updates on form submit buttons, and use clean inset box-shadow borders for active item selection in list pickers.
