---
name: design-interface
description: Use when designing interfaces, comparing interface alternatives, applying Design It Twice, or exploring interfaces for a module.
---

# Design Interface

When the user wants to explore alternative interfaces for a chosen deep-module candidate. Based on "Design It Twice" (Ousterhout) — your first idea is unlikely to be the best.

Load skill: [vocabulary](../vocabulary/SKILL.md).

## Process

### 1. Frame the problem space

Write a user-facing explanation of the problem space for the chosen candidate:

- The constraints any new interface would need to satisfy
- The dependencies it would rely on, and which category they fall into (see [deep-modules](../deep-modules/SKILL.md))
- A rough illustrative code sketch to ground the constraints — not a proposal, just a way to make the constraints concrete

Show this to the user, then immediately proceed to Step 2.

### 2. Produce interface designs

Produce 3+ **radically different** interfaces for the deepened module.

1. "Minimize the interface — aim for 1–3 entry points max. Maximise leverage per entry point."
2. "Maximise flexibility — support many use cases and extension."
3. "Optimise for the most common caller — make the default case trivial."

The output for each design is:

1. Interface (types, methods, params — plus invariants, ordering, error modes)
2. Usage example showing how callers use it
3. What the implementation hides behind the seam
4. Dependency strategy and adapters (see [deep-modules](../deep-modules/SKILL.md))
5. Trade-offs — where leverage is high, where it's thin

### 3. Present and compare

Present designs sequentially so the user can absorb each one, then compare them in prose. Contrast by **depth** (leverage at the interface), **locality** (where change concentrates), and **seam placement**.

After comparing, give your own recommendation: which design you think is strongest and why. If elements from different designs would combine well, propose a hybrid. Be opinionated — the user wants a strong read, not a menu.
