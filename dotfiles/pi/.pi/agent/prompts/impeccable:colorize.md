---
description: Add strategic color to features that are too monochromatic or lack visual interest. Makes interfaces more engaging and expressive.
---

Strategically introduce color to designs that are too monochromatic or lacking in visual warmth. Use the frontend-design skill for color guidelines and anti-patterns.

$ARGUMENTS

## Understand Context First

Gather target audience, use cases, brand personality, and especially existing brand colors from the conversation or codebase. If unclear, ask before proceeding. Color without context produces generic AI slop palettes.

## Assess

Identify where color adds value: semantic meaning (success/error/warning/info states), hierarchy (drawing attention to important elements), categorization (sections, types, states), emotional tone, wayfinding, and moments of delight.

## Color Strategy

Choose 2-4 colors beyond neutrals. Apply the 60/30/10 rule: dominant color (60%), secondary (30%), accent (10%).

### Where to Apply Color

- **Semantic states**: Success (green tones), error (red/pink), warning (amber), info (blue)
- **Primary actions**: Color the most important buttons/CTAs
- **Icons and links**: Colorize for recognition and personality
- **Backgrounds**: Replace pure gray with tinted neutrals using OKLCH. Subtle background colors to separate areas
- **Borders and accents**: Colored left/top borders on cards, focus rings matching brand
- **Data visualization**: Color to encode categories or values
- **Typography**: Brand colors on section headings (maintaining contrast)

### Technical Notes

Use OKLCH for perceptually uniform color scales. Tint neutrals toward your brand hue — even subtle tinting creates cohesion.

## Constraints

- More color ≠ better — every color should have a purpose
- Never put gray text on colored backgrounds — use a darker shade of the background color or transparency
- Never use pure gray for neutrals — add subtle color tint
- Don't use pure black (#000) or pure white (#fff) for large areas
- Don't rely on color as the only indicator (accessibility)
- Ensure WCAG contrast compliance (4.5:1 for text, 3:1 for UI components)
- Don't default to purple-blue gradients (AI slop aesthetic)
- Test for color blindness — verify red/green combinations work
