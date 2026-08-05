---
name: development-guidelines
description: Load when planning, designing, reviewing, or implementing software changes. Applies behavior-driven TDD, strict TypeScript where relevant, functional coding preferences, safe increments, verification, and documentation routing without overriding project conventions.
---

> Adapted from: https://github.com/citypaul/.dotfiles/blob/6220d843058ff33bb7d3dd3af175fd82b1c7965d/claude/.claude/CLAUDE.md
> Imported from commit: `6220d843058ff33bb7d3dd3af175fd82b1c7965d`
> License: MIT, Copyright (c) 2024 Paul Hammond

# Development Guidelines

Follow repository instructions first. Apply these defaults where the project does not define a stricter convention.

- New or changed observable behavior follows `tdd`; behavior-preserving work follows `refactoring` or `reduce-system-complexity` from passing evidence.
- Tests describe observable behavior through the interface at the layer named by the claim. Load `testing` plus `front-end-testing` or `react-testing` when relevant.
- Use `codebase-design` for module responsibility, depth, seams, and interface design. Use `structure-codebase` for physical layout.
- In TypeScript, load `typescript-strict`. Validate unknown data at trust boundaries and avoid unchecked `any` or assertions.
- Prefer immutable data and clear functional transformations where they fit the project. Load `functional` for detailed patterns.
- Work in small known-good increments. Use `reproducible-locally` for repeatable automated proof of changed behavior.
- Wait for explicit user approval before each commit and load `git-commit` when committing.
- After significant work, load `expectations` when a non-obvious lesson, decision, or gotcha should become durable documentation.

The upstream file contains historical rationale and a larger routing catalog in [`references/upstream-guidelines.md`](references/upstream-guidelines.md). Treat it as source material, not active host-specific instructions.
