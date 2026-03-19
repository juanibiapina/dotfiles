---
description: Normalize design to match your design system and ensure consistency
---

Analyze and redesign a feature to match design system standards, aesthetics, and established patterns.

$ARGUMENTS

## Plan

Before making changes, deeply understand the context:

1. **Discover the design system**: Search for design system docs, UI guidelines, component libraries, or style guides. Study core principles, target audience, component patterns, and design tokens. If something isn't clear, ask.

2. **Analyze the feature**: Where does it deviate from design system patterns? Which inconsistencies are cosmetic vs functional? Root cause: missing tokens, one-off implementations, or conceptual misalignment?

3. **Create a normalization plan**: Which components can be replaced with design system equivalents? Which styles need tokens instead of hard-coded values? How can UX patterns match established flows? Prioritize UX consistency and usability over visual polish alone.

## Execute

Systematically address inconsistencies across: typography (fonts, sizes, weights), color (design system tokens), spacing (token-based margins/padding/gaps), components (replace custom implementations with design system equivalents), motion (match timing and easing patterns), responsive behavior (align breakpoints), accessibility (contrast ratios, focus states, ARIA labels), and progressive disclosure (match information hierarchy patterns).

Don't create one-off components when design system equivalents exist. Don't hard-code values that should use tokens.

## Clean Up

Consolidate new reusable components into the design system. Remove orphaned code. Verify no regressions with lint, type-check, and tests. Eliminate duplication introduced during refactoring.
