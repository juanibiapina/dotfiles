---
name: expectations
description: Capture learnings, gotchas, and architectural decisions in the right project documentation while context is fresh. Use when the user says "document this", "remember this pattern", or asks what future work should know, and after significant changes when durable knowledge was discovered.
---

> Adapted from: https://github.com/citypaul/.dotfiles/tree/6220d843058ff33bb7d3dd3af175fd82b1c7965d/claude/.claude/skills/expectations
> Imported from commit: `6220d843058ff33bb7d3dd3af175fd82b1c7965d`
> License: MIT, Copyright (c) 2024 Paul Hammond

# Expectations

Ask after significant work: **What do I wish I had known at the start?**

Capture knowledge when it prevents a repeated mistake, saves meaningful investigation, explains a non-obvious constraint, or records a decision and its trade-offs. Do not document code structure, git history, or facts that are clear from the source.

## Choose the destination

| Knowledge | Destination |
|---|---|
| Repository-specific gotcha, tool rule, or agent workflow | The nearest applicable `AGENTS.md` |
| Durable architecture or dependency decision | The project's existing ADR convention |
| Discovery affecting active planned work | The active plan file or durable plan artifact |
| User-facing behavior, setup, or usage | README or the project's documentation |
| Personal cross-project knowledge, when requested | The `notes` skill |

Follow the project's existing convention. Do not invent an ADR directory, memory file, or parallel documentation tree.

## Write the useful fact

State:

1. the context in which it applies;
2. the unexpected constraint or decision;
3. the action future work should take;
4. evidence or rationale when the claim is not self-evident.

Keep the entry short enough to scan. Update existing guidance instead of appending a duplicate. Verify commands, paths, and behavior against the source or running system before recording them.

Wait for explicit user approval before committing documentation changes.
