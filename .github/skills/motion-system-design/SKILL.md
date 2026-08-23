---
name: motion-system-design
description: Use when a website needs a coherent system for animation, hover, press, focus, state transitions, page transitions, scroll-linked motion, reduced motion, or motion-performance rules.
---

# Motion System Design

## Principle

Motion explains hierarchy, causality, feedback, continuity, or character. If it does none of those, remove it. For narrative scroll systems, pair with `scroll-experience-design`; this skill owns the behavioural language across the whole site.

## Decision test

For every motion ask:
1. What does it explain?
2. What caused it?
3. Does it delay reading or action?
4. Is meaning preserved without position change?
5. Is it acceptable on a modest phone?

## Define the system

Specify:
- motion personality in three adjectives
- timing and easing scale
- entrance rules
- hover, focus, press, and touch states
- open/close, selected/unselected, loading/success/error transitions
- navigation/page transitions
- boundary between ordinary UI motion and scroll-linked experience motion
- reduced-motion equivalents

## Baseline

Prefer `transform` and `opacity` for continuous animation. Avoid animating layout properties and avoid `transition: all`. UI response should feel immediate. Gate hover behaviour to hover-capable fine pointers.

Do not animate body copy while it is being read, validation in ways that delay comprehension, critical CTAs away from the pointer, dense data merely for decoration, or every section merely because a reveal primitive exists.

## Scroll boundary

Use `scroll-experience-design` when scroll itself is narrative input. Do not smuggle a scrollytelling system into a general motion specification. Ordinary content should remain ordinary flow unless movement clarifies the story.

## Mobile

Reduce simultaneous effects, nonessential parallax, continuously active assets, and long entrances. Pause off-screen work. Replace hover assumptions with touch feedback.

## Reduced motion

Preserve hierarchy, state, content, navigation, sequence, and conversion actions. Remove unnecessary travel, parallax, scrub dependence, and large transforms. Reduced motion is an alternate composition, not `animation: none` sprayed over the page.

## Output

Return motion principles, timing/easing tokens, component rules, scroll boundary, interaction states, reduced-motion behaviour, mobile constraints, performance notes, and a never-animate list.
