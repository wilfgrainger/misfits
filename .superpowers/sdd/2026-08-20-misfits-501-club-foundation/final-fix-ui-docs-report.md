# Final UI and docs fix report

Status: complete

Commit: `328eed5` (`fix: align club authority and accessibility docs`)

## Changes

- Replaced the small red accent with `#d66a5d`, which passes 4.5:1 against both the actual `#070706` header and `#090909` hero surfaces.
- Replaced the prior token-string check with a self-contained semantic contrast calculation that parses the final CSS declarations.
- Added a regression assertion that exactly one document theme color matches the manifest.
- Removed the duplicate `theme-color` declaration from `index.html`.
- Pointed v1 and v2 historical notices to v4; marked v3 historical-only.
- Clarified in v4 that invite-based membership and existing administrator league operations are foundation capabilities, while membership requests, fixtures/scheduling, and other listed follow-ons remain gated.

## Verification

- RED: new focused assertions failed 2 tests before the implementation.
- Focused: `./node_modules/.bin/vitest run tests/client/platform-assets.test.ts` — 5/5.
- Client: `./node_modules/.bin/vitest run tests/client` — 37/37.
- Full: `./node_modules/.bin/vitest run` — 110/110.
- Typecheck: client and worker `tsc --noEmit` commands — pass.
- Production build: `./node_modules/.bin/vite build` — pass.
- `git diff --check` — pass.

## Concerns

None within the requested scope. No runtime feature, URL, club decision, or gated workflow was added.
