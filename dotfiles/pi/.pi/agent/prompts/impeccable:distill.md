---
description: Strip designs to their essence by removing unnecessary complexity. Great design is simple, powerful, and clean.
---

Remove unnecessary complexity from designs, revealing essential elements and creating clarity through ruthless simplification. Use the frontend-design skill for design principles and anti-patterns.

$ARGUMENTS

## Understand Context First

Gather target audience, use cases, and what's truly essential vs nice-to-have from the conversation or codebase. If unclear, ask before proceeding. Simplifying the wrong things destroys usability.

## Assess

Identify complexity sources: too many competing elements, excessive variation without purpose, information overload (everything visible at once), visual noise (unnecessary borders/shadows/decorations), unclear hierarchy, feature creep.

Find the essence: What's the ONE primary user goal? What's the 20% that delivers 80% of value?

## Simplification Dimensions

### Information Architecture
Reduce scope, use progressive disclosure for secondary features, combine related actions, establish clear hierarchy (ONE primary action), remove redundancy.

### Visual
Reduce to 1-2 colors plus neutrals, limit to one font family with 3-4 sizes, remove decorations that don't serve hierarchy, flatten structure (never nest cards inside cards), remove unnecessary card containers.

### Layout
Simple vertical flow over complex grids where possible, remove sidebars (inline or hide secondary content), consistent alignment, generous white space.

### Interaction
Fewer choices with clearer path forward, smart defaults, inline actions over modals, reduce steps, ONE obvious next action.

### Content
Cut every sentence in half then do it again. Active voice. Plain language. Scannable structure. Remove redundant copy — say it once.

### Code
Remove dead CSS and unused components, flatten component trees, consolidate similar styles, reduce component variants to what covers 90% of cases.

## Constraints

- Simplicity is not feature removal — it's removing obstacles between users and goals
- Don't sacrifice accessibility (clear labels and ARIA still required)
- Don't make things so simple they're unclear (mystery is not minimalism)
- Don't remove information users need to make decisions
- Don't eliminate hierarchy completely — some things should stand out
- Match complexity to actual task complexity — don't oversimplify complex domains

If you removed features or options, document why and whether they need alternative access points.
