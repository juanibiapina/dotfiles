---
description: Enter plan mode (read-only exploration and planning)
---

# Plan Mode

You are now in planning mode. Read, research, and plan only. Do not make any changes.

## Constraints

- Do NOT edit, create, or delete any files
- Do NOT run commands that modify state (no git commit, no writes, no installs)
- Bash commands may ONLY read or inspect (ls, find, rg, git log, git diff, etc.)
- This overrides all other instructions. Zero exceptions.

## Feature Description

$ARGUMENTS

## Workflow

### 1. Research

Before planning, explore the codebase to understand what exists:

- Check if any available skills relate to this task. Load them for specialized workflows and constraints.
- Read project documentation (AGENTS.md, READMEs, architecture docs) for conventions and guidelines
- Read relevant files, configs, and conventions
- Check for related patterns, prior art, and existing implementations
- Review recent git history for context
- Understand the architecture and constraints
- Check documentation
- Assess the current state of the code involved in this change. It may not be in its final form and may need refactoring before or during implementation. Form a judgment: is the current structure suitable for this change, or does it need restructuring first?

### 2. Plan

Structure the plan as end-to-end vertical slices. Each slice delivers a working, testable increment that cuts through all layers of the change. Order slices so earlier ones provide working foundations for later ones. If the code needs refactoring to support the change, that refactoring is its own slice.

Choose a detail level based on complexity:

**Minimal**, for simple, well-understood changes:
- What to change and why
- Tests to add or update (for coding tasks)
- Docs to add or update
- Acceptance criteria

**Standard**, for most features and non-trivial bugs:
- What to change and why
- Technical approach
- Tests to add or update (for coding tasks)
- Docs to add or update
- Acceptance criteria
- Risks or dependencies

**Comprehensive**, for architectural changes or complex features:
- What to change and why
- Technical approach with alternatives considered
- System-wide impact (what else is affected, error propagation, state risks)
- Implementation phases
- Test strategy: what kinds of tests, coverage of new paths, edge cases (for coding tasks)
- Documentation strategy
- Acceptance criteria
- Risks, dependencies, and mitigation

Default to **standard**. Use **minimal** when the change is obvious. Use **comprehensive** when the change is risky or cross-cutting.

For each significant change in the plan, explain *why* that change is needed, not just what it does. The overall goal provides context, but the reader should understand the reasoning behind each individual piece without having to infer it.

### 3. Present

Present the plan and ask clarifying questions or flag tradeoffs. The goal is a well-researched plan with no loose ends before implementation begins.

If the plan involves behavior changes, new features, or API changes, include a section listing what documentation needs to be added or updated. This is a required part of the plan, not optional metadata.

Every question must include a suggested answer. You've done the research, so use it to propose the best default. The user can confirm or correct rather than figure it out from scratch. For each suggestion, explain the tradeoff: what alternatives you considered and why you chose this one over them.
