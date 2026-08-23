---
name: scroll-experience-design
description: Use when scrolling is intended to drive narrative, media, spatial movement, pinned states, reveals, lateral travel, interactive storytelling, or a website experience that must feel structurally unique rather than like a conventional document.
---

# Scroll Experience Design

## Principle

Scroll is a timeline only when the story earns one. Choose feeling and narrative first, then interaction. A scroll effect looking for content is decoration.

## Inputs

Know the audience and conversion goal, journey beats, desired emotional curve, one moment the visitor should remember, real brand/media assets, mobile/performance constraints, and accessibility/reduced-motion requirements. If the brief is weak, return to `web-creative-direction`.

## 1. Pick the experience structure

Choose one organising grammar. Useful families include continuous cinematic journey, editorial chapters, live product surface, persistent spatial world, typography-led field, gallery/catalogue, split comparison, and rapid-cut sequence.

Define what the chosen grammar forbids. Prohibitions keep the design from drifting into a familiar house template halfway through.

## 2. Write the emotional score

Before choosing devices, write one line per beat:

`emotion → visible cause`

Rules:
- adjacent beats should not create the same emotional state
- choose one peak
- give the peak contrast and room
- design the ending as resolution, not a generic footer

Complete: `It's the site where ______.` The blank must describe an experience, not technology.

## 3. Invent one signature interaction

Create one interaction that belongs specifically to this brand/story. It must not be a recoloured or retimed standard effect. It cannot carry essential meaning if unavailable on touch or reduced-motion devices.

## 4. Choose devices per beat

- **scrub** for hand-controlled media/time
- **pin** for holding context while an argument/state advances
- **pan** for breadth/range
- **reveal** for a meaningful state change
- **flow** for normal reading
- **parallax/depth** only when spatial hierarchy benefits
- **kinetic type** only when typography itself is the event
- **pointer response** as optional embodiment, never required meaning

Avoid repeating one family consecutively. Limit heavy media. Scroll distance is narrative time, so remove dead spans where the wheel moves but the experience does not.

## 5. Mobile and reduced motion

Re-compose rather than shrink: shorten spans, reduce simultaneous layers, use media conservatively, remove hover-dependent meaning, keep lateral content reachable, and preserve sequence/copy/choices/CTA under reduced motion.

## 6. Verification contract

A scroll experience has many states. Verify a representative timeline at desktop, mobile, and reduced motion. Check dead scroll, frozen media, copy that never becomes fully legible, contrast over changing media, unreachable lateral content, broken pinned handoffs, focus/keyboard access, console/network failures, and whether the final CTA remains present.

Use browser/screenshot automation when available, then inspect the resulting sequence or contact sheet manually. A machine can show that states exist; it cannot decide whether the sequence means anything.

## Optional implementation route

If the project wants a ready-made scroll runtime, evaluate Nate Herk's MIT-licensed Scroll Craft separately. Do not silently vendor or assume it.

## Output

Return selected grammar + prohibitions, beat-to-feeling curve, engineered peak + ending, memory sentence, signature interaction, beat/device score, pacing budget, mobile adaptation, reduced-motion equivalent, performance/media constraints, and verification matrix.
