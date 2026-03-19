---
description: Extract and consolidate reusable components, design tokens, and patterns into your design system. Identifies opportunities for systematic reuse and enriches your component library.
---

Identify reusable patterns, components, and design tokens, then extract and consolidate them into the design system for systematic reuse.

$ARGUMENTS

## Discover

Find the design system, component library, or shared UI directory. Understand its structure: component organization, naming conventions, token structure, documentation patterns.

If no design system exists, ask before creating one.

Then identify extraction opportunities:
- **Repeated components**: Similar UI patterns used 3+ times
- **Hard-coded values**: Colors, spacing, typography that should be tokens
- **Inconsistent variations**: Multiple implementations of the same concept
- **Reusable patterns**: Layout, composition, or interaction patterns worth systematizing

Not everything should be extracted. Consider frequency of use, consistency benefit, and maintenance cost vs benefit.

## Extract

Build improved, reusable versions:

- **Components**: Clear props API with sensible defaults, proper variants, accessibility built in, documentation and usage examples
- **Design tokens**: Clear naming (primitive vs semantic), proper hierarchy, documentation of when to use each
- **Patterns**: When to use, code examples, variations

## Migrate

Replace existing uses with the shared versions systematically. Test for visual and functional parity. Delete the old implementations.

## Constraints

- Design systems grow incrementally — extract what's clearly reusable now, not everything that might someday be
- Don't create components so generic they're useless
- Don't extract without considering existing design system conventions
- Don't skip TypeScript types or prop documentation
- Don't create tokens for every value — tokens should have semantic meaning
