---
name: review-architecture
description: Find deep-module opportunities in a codebase. Use when the user wants to improve architecture, refactor, consolidate tightly-coupled modules, or make a codebase more testable and AI-navigable.
---

# Review Architecture

Surface architectural friction and propose **deep-module opportunities** — refactors that turn shallow modules into deep ones.

Load skill: [code-design](../code-design/SKILL.md).
Load skill: [deep-modules](../deep-modules/SKILL.md).

## Process

### 1. Explore Codebase

- Read existing documentation.
- Explore the codebase using deep-module principles.

### 2. Present candidates

Present a numbered list of deep-module opportunities. For each candidate:

- **Files** — which files/modules are involved
- **Problem** — why the current architecture is causing friction
- **Solution** — plain English description of what would change
- **Benefits** — explained in terms of locality and leverage, and also in how tests would improve

Do NOT propose interfaces yet. Ask the user: "Which of these would you like to explore?"

### 3. Explore a candidate

Once the user picks a candidate, load and follow [explore-design-space](../explore-design-space/SKILL.md). Explore the selected deep-module opportunity as the plan or design under review.
