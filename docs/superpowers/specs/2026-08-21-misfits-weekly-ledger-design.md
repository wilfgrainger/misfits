# Misfits Weekly Ledger Design

## Goal

Turn Misfits 501 from a poster-led league interface into the credible weekly record for one darts club. The redesigned public page must answer where the club stands; the signed-in page must answer what a member or administrator needs to do next.

## Product decisions

- The supplied `public/brand/misfits-501.jpg` remains unchanged. It is shown once in the shared header as the full, contained club badge. It is never duplicated, cropped, filtered, faded, used as a background, or used as a hero illustration.
- Public sharing remains a deliberate feature. Existing seasons retain their stored visibility; there is no silent migration of existing public tables. New seasons default to `PRIVATE`, and an administrator must explicitly select `Public` to publish one.
- The public surface is a club record, not a sign-in campaign. It has a compact dark masthead, a concise title and explanatory line, then the active public season's standings without a full-screen marketing hero.
- Signed-in members and administrators do not see a promotional introduction. Their first content is their account and current season context.
- The terminology is club-first: `Club table`, `Current season`, `Season admin`, `Record a result`, and `Club access`. The application does not call itself a workspace, door, control room, or generic league-management product.

## Visual system

The visual model is a clean weekly ledger beside a dartboard: charcoal ink, warm off-white paper, thin rules, direct labels, tabular scores, and restrained red for a selected state, an unresolved task, or a key score. It has no decorative hero copy, brass framing, faux-aged surfaces, slogan, coloured metric cards, or repeated artwork.

The shared header is charcoal with the one intact logo, `The Misfits 501 Club`, a factual `Darts club` descriptor, and the signed-in account/action state. The header logo is 44px on phones and 52px on wider screens, with `object-fit: contain` and no decorative frame.

Every operational surface uses the same robust sans-serif family. Scores and standings use tabular numerals. Headings use weight, spacing, and rule placement rather than a display font or an eyebrow label. Focus, selection, caret, scrollbar, links, disabled controls, loading states, errors, and empty states belong to this same palette.

## Public record

The signed-out page contains, in order:

1. The shared club header.
2. A compact `The club table` introduction with: `Standings and confirmed results for the current season.` and `Sign in to record a result or confirm one.`
3. A public season selector when more than one public season exists.
4. The selected season's title, state, factual rule line, share action, and an accessible standings table with columns `Pos`, `Player`, `P`, `W-L`, `Avg`, and `Pts`.
5. The existing latest-results feed when results exist, or the direct empty state `No confirmed results yet.`

The public record must remain usable at 320px and 390px. On a narrow screen, its table stays semantic and scrolls only inside its clearly labelled table region when its columns cannot fit; the document itself never overflows horizontally.

## Signed-in club record

After sign-in, remove `page-intro` entirely. The account heading states the member's name and role, followed by a factual current-season line. The member table keeps its existing results, player list, result entry, profile, confirmation, and dispute behaviours. Its table gets the same visible data headings and tabular alignment as the public table.

## Season admin

The administrative area becomes `Season admin` with four discoverable tasks: `Season`, `Members & invites`, `Results`, and `Club access`. These are real tabs: a `tablist`, one selected `tab`, matching `tabpanel` IDs, `aria-controls`, `aria-selected`, keyboard left/right/home/end navigation, and focus remaining on the activated tab.

At phone widths the four administrative tasks form a visible two-column grid; none are hidden in a horizontal strip. At desktop, they become the persistent left task rail beside the working panel.

The Season task shows the selected current season before configuration or creation:

- Explicit context: `Current season: [club] · [season] · [state] · [visibility]`.
- Season settings grouped with labelled fieldsets: `Season identity`, `Match rules`, and `Access`.
- `Create a new season` is a closed native disclosure after current settings. Its fields retain labels, use `Club name` and `Season` unambiguously, and begin with `Private` selected.
- Existing public seasons retain the Share season action; private seasons do not advertise a share action.

The Results task is headed `Record a result`. The People task becomes `Club access` and states that roles and account status apply to the whole club.

## Data and behaviour boundaries

- No API route, score-validation rule, result-confirmation rule, member permission, invite token, authentication method, or data model changes solely for the redesign.
- The only persisted behaviour change is the client-selected default passed by `createAdminLeague`: `visibility: 'PRIVATE'` unless an administrator actively chooses `PUBLIC`.
- Existing `visibility` values are read and saved as-is. No D1 migration changes them.

## Accessibility and responsive requirements

- Text on light and dark surfaces meets WCAG AA contrast. The previous signed-in dark heading is removed rather than recoloured.
- All controls retain at least a 44px target, native labels, visible keyboard focus, and clear disabled/loading feedback.
- Heading order is logical: one public `h1`, then section and season headings. A signed-in page has no empty decorative heading.
- At 320px, 390px, and desktop widths: no document horizontal overflow, no clipped header/control, all Season admin tasks visible, and table labels remain discoverable.
- Reduced-motion users see the final layout immediately. At most one subtle public-surface reveal is used for users who allow motion.

## Test and verification contract

Component tests must prove:

- signed-out visitors see one named logo, direct club-table copy, and an accessible labelled standings table without the old slogan or duplicate seal;
- standings expose `Pos`, `Player`, `P`, `W-L`, `Avg`, and `Pts`;
- signed-in users have no marketing hero and see account/current-season context;
- Season admin exposes the selected tab/panel relationship, keyboard tab navigation, active-season context, and `Club access` naming;
- the new-season form starts closed and submits `visibility: 'PRIVATE'` unless changed;
- existing public visibility remains public after a settings save;
- the existing member, result, invite, share, and authentication contracts still pass.

Release verification requires the full test suite, client/worker typecheck, production build, Impeccable detector, local browser inspection at 320px, 390px, and desktop, a pushed branch with observed CI, and a separately observed production deployment. A branch push or local preview is never reported as production proof.
