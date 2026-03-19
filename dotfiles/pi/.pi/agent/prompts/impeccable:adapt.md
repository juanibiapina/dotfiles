---
description: Adapt designs to work across different screen sizes, devices, contexts, or platforms. Ensures consistent experience across varied environments.
---

Adapt existing designs to work effectively across different contexts: screen sizes, devices, platforms, or use cases.

$ARGUMENTS

## Assess

Understand what was designed for (desktop? mobile?) and what the target context requires (input method, screen constraints, connection speed, usage scenario). Adaptation is not just scaling — it's rethinking the experience for the new context.

## Strategies by Target

### Mobile (from Desktop)

- Single column, vertical stacking, full-width components
- Bottom navigation, hamburger/drawer instead of sidebar
- Touch targets 44x44px minimum, no hover-dependent interactions
- Progressive disclosure: primary content first, secondary in tabs/accordions
- 16px minimum text, more concise copy

### Tablet (Hybrid)

- Two-column layouts, master-detail views
- Support both touch and pointer input
- Adaptive based on orientation (portrait vs landscape)

### Desktop (from Mobile)

- Multi-column layouts using horizontal space
- Side navigation always visible, hover states for extra info
- Keyboard shortcuts, right-click menus, drag and drop, multi-select
- Show more information upfront, richer data tables and visualizations

### Print (from Screen)

- Remove interactive elements, add page breaks, proper margins
- Expand hidden content, show full URLs, add page numbers
- Black and white or limited color

### Email (from Web)

- 600px max width, single column, inline CSS, table layouts
- Large obvious CTAs, no hover states, deep links back to web app

## Constraints

- Don't hide core functionality — adapt it for the context
- Don't use different information architecture across contexts
- Follow platform conventions (mobile users expect mobile patterns)
- Test on real devices and orientations, not just browser DevTools
- Use content-driven breakpoints where the design breaks, not generic ones
