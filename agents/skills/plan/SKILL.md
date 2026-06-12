---
name: plan
description: Use when asked to plan a coding task. Produces a written implementation plan (research plus steps) for a code change.
---

# Plan

Research the codebase and produce an implementation plan. Make no source-code
changes.

## Workflow

### 1. Research

Before planning, explore the codebase to understand what exists:

- Load the `vocabulary` skill so the plan uses consistent software-design terms
- Read project documentation (READMEs, docs) for conventions and guidelines
- Explore relevant files, where changes will be made, potentially related files that may need to change
- Check for related patterns, prior art, and existing implementations
- Review recent git history for context
- Understand the architecture and constraints
- Understand the current state of the code involved in this change

### 2. Plan

Choose a detail level based on complexity:

**Minimal**, for simple, well-understood changes:
- Goal
- What to change and why
- Tests to add or update
- Docs to add or update
- Acceptance criteria

**Comprehensive**, for architectural changes, complex features or entire new projects:
- Goal
- What to change and why
- Technical approach with alternatives considered
- System-wide impact (what else is affected, error propagation, state risks)
- Implementation phases
- Test strategy: what kinds of tests, coverage of new paths, edge cases
- Documentation strategy
- Acceptance criteria
- Risks, dependencies, and mitigations

Default to **minimal**.

### 3. Output

Write the detailed plan to a file in a tmp dir (use `mktemp` or `$TMPDIR`).
Return the file path plus a short summary covering high level steps,
architectural changes, public interface changes, and breaking changes.
