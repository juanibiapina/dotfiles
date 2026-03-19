---
description: Final quality pass before shipping. Fixes alignment, spacing, consistency, and detail issues that separate good from great.
---

Meticulous final pass to catch all the small details that separate good work from great work. Use the frontend-design skill for design principles and anti-patterns.

$ARGUMENTS

## Prerequisites

Polish is the last step. Don't polish work that's not functionally complete.

## Polish Dimensions

### Visual Alignment & Spacing
Everything lines up to grid. All gaps use spacing scale (no random values). Optical alignment adjusted for visual weight. Consistent at all breakpoints.

### Typography
Hierarchy consistent throughout (same elements use same sizes/weights). Line length 45-75 chars for body text. No widows/orphans. No FOUT/FOIT font loading flashes.

### Color & Contrast
All text meets WCAG contrast ratios. No hard-coded colors (all use design tokens). Consistent across theme variants. Tinted neutrals, no pure gray or pure black. Never gray text on colored backgrounds.

### Interaction States
Every interactive element needs: default, hover, focus (keyboard indicator), active, disabled, loading, error, and success states. Missing states create confusion.

### Transitions
All state changes animated (150-300ms). Consistent easing (ease-out-quart/quint/expo, never bounce). 60fps, only transform and opacity. Respect `prefers-reduced-motion`.

### Content & Copy
Consistent terminology and capitalization. No typos. Appropriate length. Consistent punctuation.

### Icons & Images
Consistent style and sizing. Proper optical alignment with text. Alt text on all images. No layout shift (proper aspect ratios). Retina support.

### Forms
All inputs labeled. Required indicators clear and consistent. Helpful error messages. Logical tab order. Consistent validation timing.

### Edge Cases
Loading, empty, error, and success states all present. Long content handled. No horizontal scroll. Content adapts at all breakpoints.

### Code Quality
Remove console logs, commented code, unused imports. Consistent naming. No TypeScript `any`. Proper ARIA and semantic HTML.

## Constraints

- Don't polish before functional completion
- Don't introduce bugs while polishing — test thoroughly
- Don't perfect one thing while leaving others rough — consistent quality level
- If spacing is off everywhere, fix the system rather than individual instances
