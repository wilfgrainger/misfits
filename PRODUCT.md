# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Players use Misfits 501 around a weekly darts board, usually on a phone. The club administrator uses a desktop browser to set up seasons, invite members and correct results.

## Product Purpose

Misfits 501 is the durable home for one private darts club. DartCounter scores games; Misfits records agreed results, settles the table and keeps the club's seasons in order.

## Positioning

It is a single club's record book, not a league-management product that can be rebranded, sold to other clubs or used for live scoring.

## Operating Context

The public can see a deliberately chosen club table. Invited members sign in with Google, enter results and confirm or dispute an opponent's result. Administrators manage seasons, members, invitations and corrections.

## Capabilities and Constraints

- One club may keep many seasons over time.
- Google Identity Services is the sole sign-in method; the Worker verifies identity and authorizes protected actions.
- The core path is one Cloudflare Worker, static assets and one D1 database on the free tier.
- No paid Cloudflare service, queue, R2, Durable Object, scheduled job, background polling or remote D1 migration automation belongs in the core path.
- Mobile web is the board-side primary context; desktop remains first-class for tables and administration.

## Brand Commitments

Use the supplied Misfits 501 artwork at `public/brand/misfits-501.jpg` intact as a club asset. It may become a very low-contrast watermark in the private admission world only when copy remains plainly readable; it is never decorative wallpaper for product data. The fixed promise is: “Club darts, properly settled.” The voice is direct, restrained and slightly wrong rather than generic sport or SaaS copy.

## Evidence on Hand

- Real club artwork: `public/brand/misfits-501.jpg`.
- A real production address is recorded in `PROGRESS.md`.
- No testimonials, commercial claims, invented member stories or statistical claims may be created for presentation.

## Product Principles

- One club, properly kept.
- The table is the shared truth.
- Let DartCounter score; let Misfits settle.
- A club desk should make ordinary work feel calm and accountable.
- Build only the free-tier club-scale path that is needed now.

## Accessibility & Inclusion

Keyboard-operable controls, visible focus, semantic headings and labelled forms/dialogs are required. Touch targets must remain usable at the board and content must reflow cleanly between phone and desktop.
