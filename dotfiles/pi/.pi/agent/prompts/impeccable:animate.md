---
description: Review a feature and enhance it with purposeful animations, micro-interactions, and motion effects that improve usability and delight.
---

Analyze a feature and strategically add animations and micro-interactions that enhance understanding, provide feedback, and create delight. Use the frontend-design skill for motion guidelines.

$ARGUMENTS

## Assess

Identify where motion would improve the experience: missing feedback on actions, jarring state changes, unclear spatial relationships, lack of delight. Understand the brand personality (playful vs serious) and performance constraints before adding motion.

One well-orchestrated experience beats scattered animations everywhere. Focus on high-impact moments.

## Animation Categories

### Entrance Animations
Page load choreography with staggered reveals, hero section treatments, scroll-triggered content reveals, modal/drawer entry with slide + fade.

### Micro-interactions
Button feedback (hover scale, click press, loading state), form input focus transitions, toggle switches, checkbox animations.

### State Transitions
Show/hide with fade + slide (not instant), expand/collapse with height transitions, loading/success/error state changes.

### Navigation & Flow
Page crossfades, tab slide indicators, carousel transforms, scroll progress indicators.

## Timing Reference

| Purpose | Duration |
|---------|----------|
| Instant feedback (button, toggle) | 100-150ms |
| State changes (hover, menu) | 200-300ms |
| Layout changes (accordion, modal) | 300-500ms |
| Entrance animations (page load) | 500-800ms |

Exit animations should be ~75% of enter duration.

**Easing:** Use ease-out-quart/quint/expo for natural deceleration. Never bounce or elastic — they feel dated.

## Constraints

- Only animate `transform` and `opacity` (GPU-accelerated) — never layout properties
- Always respect `prefers-reduced-motion` with a media query fallback
- Don't use durations over 500ms for feedback — it feels laggy
- Don't animate without purpose — every animation needs a reason
- Don't animate everything — animation fatigue makes interfaces exhausting
