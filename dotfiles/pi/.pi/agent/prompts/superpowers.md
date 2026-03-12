---
description: Superpowers development methodology — index of available templates and workflow guide
---

# Superpowers

A structured development methodology for turning ideas into high-quality implementations through collaborative design, detailed planning, and disciplined execution with review gates.

Based on [Superpowers](https://github.com/obra/superpowers) by Jesse Vincent.

## Workflow

The typical flow is: **brainstorm → plan → execute → review → finish**. Not every step is always needed — use what fits.

```
Idea → /superpowers:brainstorm → /superpowers:write-plan → execute → /superpowers:finish-branch
                                                              │
                                              ┌───────────────┴───────────────┐
                                              │                               │
                                   /superpowers:subagent-dev       /superpowers:execute-plan
                                   (fresh subagent per task)       (current session execution)
```

## Available Templates

### Core Workflow

| Template | Purpose |
|----------|---------|
| `/superpowers:brainstorm` | Collaborative design exploration before coding |
| `/superpowers:write-plan` | Break a spec into bite-sized implementation tasks |
| `/superpowers:execute-plan` | Execute a plan in the current session with checkpoints |
| `/superpowers:subagent-dev` | Execute a plan via fresh subagent per task + two-stage review |
| `/superpowers:worktree` | Create an isolated git worktree workspace |
| `/superpowers:finish-branch` | Verify tests, present merge/PR/keep/discard options |

### Disciplines

| Template | Purpose |
|----------|---------|
| `/superpowers:tdd` | Enforce RED-GREEN-REFACTOR test-driven development |
| `/superpowers:debug` | Systematic 4-phase root cause investigation |
| `/superpowers:verify` | Require evidence before any completion claims |

### Review

| Template | Purpose |
|----------|---------|
| `/superpowers:review` | Request code review via subagent |
| `/superpowers:receive-review` | Handle review feedback with technical rigor |
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
| Have a plan, want same-session execution | `/superpowers:execute-plan` |
| Need isolated workspace | `/superpowers:worktree` |
| Implementation complete | `/superpowers:finish-branch` |
| Bug or unexpected behavior | `/superpowers:debug` |
| Want TDD discipline | `/superpowers:tdd` |
| About to claim something is done | `/superpowers:verify` |
| Want code reviewed | `/superpowers:review` |
| Received review feedback | `/superpowers:receive-review` |
| Multiple independent tasks | `/superpowers:parallel` |

## Principles

- **One question at a time** during brainstorming — don't overwhelm
- **YAGNI ruthlessly** — remove unnecessary features from all designs
- **TDD always** — no production code without a failing test first
- **Evidence before claims** — run verification, then report results
- **Fresh subagents** — isolated context per task prevents pollution
- **Review early, review often** — catch issues before they cascade
