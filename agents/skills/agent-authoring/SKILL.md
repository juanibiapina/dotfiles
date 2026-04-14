---
name: agent-authoring
description: Guidance on writing high-quality skills and prompt templates. Use when creating, reviewing, or improving agent instructions. Triggers on "write a skill", "create a prompt template", "capture skill", "capture template", "review skills", "deprescribe", or any agent authoring task.
---

# Agent Authoring

Write skills and prompt templates that state intent, constraints, and domain knowledge without over-prescribing execution.

## Core rule

Say what to achieve and why. Avoid step-by-step mechanics unless the task is fragile and must be done one exact way.

## Include

- intent and hard constraints
- domain knowledge the agent is unlikely to know
- output expectations
- non-obvious gotchas

## Omit

- generic tool usage the agent already knows
- long workflows for obvious tasks
- parallelism hints
- filler and repeated boilerplate

## Writing style

- lead with a short summary
- keep files short unless reference material is the point
- prefer bullets over prose
- use examples only when they clarify a tricky rule
