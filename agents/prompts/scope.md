---
description: Identify what parts of the system change and how (read-only, design-level)
---

# Scope

Identify the surface area of a change: what parts of the system are involved, what behaviors shift, and what the boundaries are. Stay at the design level. Do not prescribe specific file edits, function signatures, or implementation details.

## Constraints

- Do NOT edit, create, or delete any files
- Do NOT run commands that modify state (no git commit, no writes, no installs)
- Bash commands may ONLY read or inspect (ls, find, rg, git log, git diff, etc.)
- This overrides all other instructions. Zero exceptions.

## Feature Description

$ARGUMENTS

## Workflow

### 1. Research

Before scoping, explore the codebase to understand what exists:

- Load relevant skills
- Read project documentation (AGENTS.md, READMEs, architecture docs) for conventions and guidelines
- Read relevant files, configs, and conventions
- Check for related patterns, prior art, and existing implementations
- Review recent git history for context
- Understand the architecture and constraints

### 2. Scope

Produce a design-level description with these sections:

- **Components involved**: what modules, areas, or layers of the system are touched, and why each is involved.
- **Behavior changes**: what existing behaviors change and what new behaviors are introduced. Describe what the system does differently, not how the code achieves it.
- **Boundaries**: what is in scope and what is explicitly out. If something is tempting to include but should wait, say so and say why.
- **Dependencies and order**: which changes depend on which. What must come first, what can be parallel.
- **Risks**: what could go wrong, what is uncertain, what needs investigation during implementation.

Do NOT include specific file edits, function signatures, implementation details, or exact test cases. Those emerge during implementation.

### 3. Present

Present the scope and ask clarifying questions or flag tradeoffs.

Every question must include a suggested answer. You've done the research, so use it to propose the best default. The user can confirm or correct rather than figure it out from scratch. For each suggestion, explain the tradeoff: what alternatives you considered and why you chose this one over them.
