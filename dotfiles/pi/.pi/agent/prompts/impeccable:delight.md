---
description: Add moments of joy, personality, and unexpected touches that make interfaces memorable and enjoyable to use. Elevates functional to delightful.
---

Identify opportunities to add moments of joy, personality, and unexpected polish that transform functional interfaces into delightful experiences. Use the frontend-design skill for motion and interaction guidelines.

$ARGUMENTS

## Understand Context First

Gather target audience, use cases, and brand personality (playful vs professional vs quirky vs elegant) from the conversation or codebase. If unclear, ask before proceeding. Delight that's wrong for the context is worse than no delight at all.

## Delight Principles

- **Amplifies, never blocks**: Delight moments should be quick (< 1 second), never delay core functionality, always skippable
- **Surprise and discovery**: Hide details for users to discover, reward exploration, don't announce every moment
- **Appropriate to context**: Match the user's emotional state (celebrate success, empathize with errors)
- **Compounds over time**: Vary responses, reveal deeper layers with continued use

## Delight Opportunities

### Micro-interactions & Animation
Satisfying button press feedback, playful loading animations, checkmark draw animations on success, confetti for major achievements, icons that animate on hover.

### Personality in Copy
Playful error messages ("This page is playing hide and seek"), encouraging empty states ("Your canvas awaits"), warm labels that match brand personality. Match copy tone to brand — banks shouldn't be wacky, but they can be warm.

### Illustrations & Visual Personality
Custom empty state illustrations, animated characters for loading, icon sets matching brand personality, time-of-day themes.

### Satisfying Interactions
Drag-and-drop with lift effects and snap animations, toggle switches with smooth spring physics, progress celebrations at milestones, form inputs that animate on focus.

### Easter Eggs
Konami code themes, console messages for developers, seasonal touches, randomized variations that keep things fresh.

### Loading & Waiting States
Rotating personality-filled loading messages, progress bars with encouragement, fun facts or tips while waiting.

## Constraints

- Delight should enhance usability, never obscure it — if users notice delight more than accomplishing their goal, it's too much
- Respect `prefers-reduced-motion` for all animations
- Don't force users through delightful moments (make skippable)
- Don't make every interaction delightful — special moments should be special
- Don't sacrifice performance for delight
- Keep audio subtle and optional with mute controls
