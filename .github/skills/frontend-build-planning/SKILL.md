---
name: frontend-build-planning
description: Use when a website design, prototype, or specification needs to be translated into an implementation architecture, component system, responsive strategy, loading plan, accessibility target, or pre-launch engineering checklist.
---

# Frontend Build Planning

## Overview

Turn the approved experience into the smallest durable implementation system. Optimise for reuse where behaviour repeats, flexibility where content changes, and simplicity where abstraction would add more cost than value.

## Inputs

Determine:
- framework/platform and hosting constraints
- page inventory
- design system
- repeating interaction patterns
- volatile versus stable content
- CMS or data requirements
- browser/device requirements
- analytics and conversion events
- accessibility target
- performance target

## Workflow

### 1. Separate patterns from pages
Extract reusable components only when visual structure or behaviour genuinely repeats. Avoid turning every wrapper into a component.

### 2. Model content volatility
Content that changes frequently should not be hard-coded into awkward component APIs. Define data/content boundaries deliberately.

### 3. Component inventory
Classify:
- foundations/tokens
- primitives
- composites
- sections
- page shells
- feature-specific components

State component responsibilities and major variants.

### 4. Folder structure
Choose structure by ownership and change patterns, not aesthetic neatness. Keep related UI, tests, styles, and feature logic discoverable.

### 5. Responsive system
Define breakpoints from layout failure points rather than device brand names. Document how navigation, grids, typography, media, CTAs, tables, and dense content transform.

### 6. Asset loading
Specify:
- image formats and responsive sources
- explicit dimensions/aspect ratios
- priority/LCP media
- lazy loading rules
- font families, subsets, weights, preload rules
- icon strategy
- third-party script budget

### 7. Accessibility
Require semantic structure, keyboard operation, visible focus, form labelling, error handling, colour contrast, reduced motion, target sizing, and sensible screen-reader order.

### 8. Performance
Set measurable targets, then design the architecture to meet them. Avoid shipping libraries for effects achievable with platform primitives.

## Output Contract

Return:
1. Architecture assumptions
2. Component inventory
3. Content/data model
4. Recommended folder structure
5. Responsive/breakpoint rules
6. Image strategy
7. Font strategy
8. Motion implementation notes
9. Accessibility requirements
10. Analytics/event plan
11. Build sequence
12. Pre-launch engineering checklist

## Quality Bar

The plan must be implementable. Avoid speculative abstraction, dependency sprawl, and technology chosen primarily for novelty.
