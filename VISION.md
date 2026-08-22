# Misfits 501 Vision

Misfits 501 is one private club for weekly darts, properly settled.

## The club

- One club, many seasons over time. No tenancy, customer-created clubs, white-label skinning or generic league marketplace.
- DartCounter is where players score. Misfits records results, confirms them, keeps the table and gives the club a home.
- Google sign-in is the members' door. Identity and permissions stay enforced by the Worker.

## The feeling

The product should feel like a well-kept private club with a slightly wrong edge: dark ground, warm cream, disciplined red, direct copy and room to breathe. It is not polished SaaS pretending to be a club.

“Club darts, properly settled.” is the landing promise.

Mobile comes first because the club uses it around a board. Desktop is a first-class browser view for tables and administration, not a stretched phone layout.

## What belongs now

- Publicly chosen club table and confirmed results.
- Google-backed member identity, invite-based league access and profile basics.
- Player result submission, opponent confirmation/dispute and administrator correction with audit records.
- Administrator-managed seasons, divisions, persisted competition fixtures, rules and promotion/relegation workflow.
- A quiet public entrance, a focused member workspace and a restrained club control room.

## What does not belong until separately approved

Player-facing fixture-first browsing and entry, membership requests, archives, player bios, social links, WhatsApp, rich statistics, live scoring, payments, tournaments, teams, multi-club support and paid infrastructure.

Persisted fixtures are already part of the competition record. What remains separately staged is how normal players and the public browse and act on those fixtures, without weakening the administrator permission boundary.

## Platform promise

The core product remains one Cloudflare Worker serving static assets and API routes with one D1 database. It is designed for Cloudflare free-tier club-scale operation: user-driven writes, no queues, R2, scheduled work, background polling or paid dependency. This is a monitored operating constraint, not a promise that provider limits never change.
