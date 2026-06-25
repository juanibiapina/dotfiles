---
name: plan
description: Use when asked to plan a coding task. Produces a written implementation plan (research plus steps) for a code change.
---

# Plan

Research the codebase and produce an implementation plan. Make no source-code
changes.

## Self-containment

A plan must be self-contained. Assume the reader has only the plan file, with no
access to the conversation that produced it. It must carry enough context and
rationale for a fresh agent to make good decisions on its own: key constraints,
decisions already made and why, and relevant background found during research.
It does not need exhaustive detail or exact code locations; it needs enough that
a competent agent can find the rest and choose well. When deciding whether
something belongs in the plan, apply this test: could a fresh agent build the
right thing from the plan alone?

## Workflow

### 1. Research

Before planning, explore the codebase to understand what exists:

- Load the vocabulary skill so the plan uses consistent software-design terms
- Load deep-modules skill for designing the code
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
- Skills to use
- Acceptance criteria

**Comprehensive**, for architectural changes, complex features or entire new projects:
- Goal
- What to change and why
- Technical approach with alternatives considered
- System-wide impact (what else is affected, error propagation, state risks)
- Implementation phases
- Test strategy: what kinds of tests, coverage of new paths, edge cases
- Documentation strategy
- Skills to use
- Acceptance criteria
- Risks, dependencies, and mitigations

Default to **minimal**.

For "Skills to use", recommend the skills available in your context that match
the work in the plan. List them by name, each with a one-line note on when it
applies during implementation (e.g. "tdd — for the parser changes",
"git-commit — when committing"). The implementing agent loads them itself.

### 3. Output

Write the detailed plan to a file in a tmp dir (use `mktemp` or `$TMPDIR`).
Return the file path plus a short summary covering high level steps,
architectural changes, public interface changes, and breaking changes.
