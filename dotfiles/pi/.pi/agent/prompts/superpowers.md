---
description: Superpowers development methodology — index of available templates and workflow guide
---

# Superpowers

A structured development methodology for turning ideas into high-quality implementations through collaborative design, detailed planning, and disciplined execution with review gates.

Based on [Superpowers](https://github.com/obra/superpowers) by Jesse Vincent.

## Workflow

The typical flow is: **brainstorm → plan → execute**. Not every step is always needed — use what fits.

```
Idea → /superpowers:brainstorm → /superpowers:write-plan → /superpowers:subagent-dev
```

## Available Templates

### Core Workflow

| Template | Purpose |
|----------|---------|
| `/superpowers:brainstorm` | Collaborative design exploration before coding |
| `/superpowers:write-plan` | Break a spec into bite-sized implementation tasks |
| `/superpowers:subagent-dev` | Execute a plan via fresh subagent per task + two-stage review |

### Disciplines

| Template | Purpose |
|----------|---------|
| `/superpowers:debug` | Systematic 4-phase root cause investigation |
| `/superpowers:parallel` | Dispatch independent tasks to concurrent subagents |

### Subagent Prompts (used via `subagent` tool, not invoked directly)

| Template | Purpose |
|----------|---------|
| `superpowers:implementer` | Task implementation subagent |
| `superpowers:spec-reviewer` | Spec compliance review subagent |
| `superpowers:quality-reviewer` | Code quality review subagent |
| `superpowers:code-reviewer` | General code review subagent |
| `superpowers:spec-doc-reviewer` | Spec document review subagent |
| `superpowers:plan-doc-reviewer` | Plan document review subagent |

## When to Use What

| Situation | Start with |
|-----------|------------|
| New feature or creative work | `/superpowers:brainstorm` |
| Have a spec, need implementation tasks | `/superpowers:write-plan` |
| Have a plan, want subagent execution | `/superpowers:subagent-dev` |
| Bug or unexpected behavior | `/superpowers:debug` |
| Multiple independent tasks | `/superpowers:parallel` |

## Principles

- **One question at a time** during brainstorming — don't overwhelm
- **YAGNI ruthlessly** — remove unnecessary features from all designs
- **Fresh subagents** — isolated context per task prevents pollution
