---
description: Creating plans. Use it for planning code changes.
---

# Creating plans

Research first. Do not make changes.

## Constraints

- Do not edit, create, or delete files
- bash commands may only read or inspect (ls, find, rg, git log, git diff, etc.)

## Workflow

- Explore the codebase to understand the current state
- Check for related patterns
- Understand recent history
- Fill in any knowledge gaps by researching online
- Load skills that may be relevant to the task
- Judge whether the current structure is fine or needs refactoring first
- Identify tradeoffs
- Write and present an implementation plan
- Refine the plan with the user

## Plan

A plan communicates to the user where changes will be made and why.

Components of a plan (some can be skipped depending on the context):

- Goal of the change
- Conceptual high-level description
- Change description in terms of file, public interfaces, names
- State and data flow
- Testing changes
- Documentation updates
- Implementation order
- Questions and tradeoffs
  - Any proposed questions must already include a proposed solution

## Refinement

The user may ask clarifying questions or propose changes. Explore the design space with the user until a shared understanding is achieved. Present an updated plan after each discussion is wrapped up.
