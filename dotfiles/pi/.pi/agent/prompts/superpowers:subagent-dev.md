---
description: Execute a plan via fresh subagent per task with two-stage review (spec compliance + code quality)
---

# Subagent-Driven Development

Execute plan by dispatching a fresh subagent per task, with two-stage review after each: spec compliance review first, then code quality review.

**Why subagents:** Fresh context per task prevents pollution. Precisely crafted instructions keep subagents focused. Your own context is preserved for coordination.

## Plan

$ARGUMENTS

## The Process

### Setup

1. Read the plan file once
2. Extract all tasks with full text and context
3. Track task progress

### Per Task

1. **Dispatch implementer subagent** with full task text + context:
   ```
   subagent({
     template: "superpowers:implementer",
     arguments: "Task N: [task name]\n\n## Task Description\n\n[FULL TEXT of task]\n\n## Context\n\n[where this fits, dependencies, architecture]"
   })
   ```

2. **Handle implementer status:**
   - **DONE** → proceed to spec review
   - **DONE_WITH_CONCERNS** → read concerns, address if needed, then proceed
   - **NEEDS_CONTEXT** → provide missing info, re-dispatch
   - **BLOCKED** → assess: provide context, use more capable model, break task down, or escalate to user

3. **Dispatch spec compliance reviewer:**
   ```
   subagent({
     template: "superpowers:spec-reviewer",
     arguments: "## What Was Requested\n\n[task requirements]\n\n## What Implementer Claims\n\n[from report]"
   })
   ```
   - If issues found → implementer fixes → re-review until approved
   - Spec must pass BEFORE code quality review

4. **Dispatch code quality reviewer:**
   ```
   subagent({
     template: "superpowers:quality-reviewer",
     arguments: "What: [description]\nPlan: [task from plan]\nBase: [base SHA]\nHead: [head SHA]"
   })
   ```
   - If issues found → implementer fixes → re-review until approved

5. **Mark task complete**, move to next task

### After All Tasks

1. Dispatch a final code review of the entire implementation:
   ```
   subagent({
     template: "superpowers:code-reviewer",
     arguments: "What: [full implementation]\nPlan: [plan file]\nBase: [initial SHA]\nHead: [current SHA]\nDescription: [summary]"
   })
   ```

2. Use `/superpowers:finish-branch` to verify tests and present options

## Model Selection

Use the least powerful model that can handle each role:

- **Mechanical tasks** (isolated functions, clear specs, 1-2 files): fast/cheap model
- **Integration tasks** (multi-file coordination, debugging): standard model
- **Architecture/review tasks**: most capable model

## Handling Implementer Escalation

**Never** ignore an escalation or force retry without changes. If the implementer is stuck:
1. Context problem → provide more context, re-dispatch
2. Task needs more reasoning → re-dispatch with more capable model
3. Task too large → break into smaller pieces
4. Plan is wrong → escalate to user

## Example Workflow

```
[Read plan: docs/superpowers/plans/feature-plan.md]
[Extract 5 tasks with full text]

Task 1: Hook installation script
  → Dispatch superpowers:implementer with full task text
  ← Implementer asks: "User or system level install?"
  → Answer: "User level (~/.config/...)"
  ← Implementer: DONE — 5 tests passing, committed
  → Dispatch superpowers:spec-reviewer
  ← Spec reviewer: ✅ Compliant
  → Dispatch superpowers:quality-reviewer
  ← Quality reviewer: ✅ Approved
  → Task 1 complete

Task 2: Recovery modes
  → Dispatch superpowers:implementer
  ← Implementer: DONE — 8 tests passing
  → Dispatch superpowers:spec-reviewer
  ← Spec reviewer: ❌ Missing progress reporting
  → Implementer fixes
  → Re-dispatch spec reviewer: ✅ Compliant
  → Dispatch superpowers:quality-reviewer
  ← Quality reviewer: Important — magic number
  → Implementer fixes
  → Re-dispatch quality reviewer: ✅ Approved
  → Task 2 complete

...

[All tasks done]
[Final code review of entire implementation]
[/superpowers:finish-branch]
```

## Red Flags

**Never:**
- Start on main/master branch without user consent
- Skip reviews (spec OR quality)
- Proceed with unfixed issues
- Dispatch multiple implementers in parallel (conflicts)
- Make subagent read plan file (provide full text instead)
- Accept "close enough" on spec compliance
- Start quality review before spec compliance passes
- Ignore subagent questions or escalations

**If reviewer finds issues:**
- Implementer fixes them
- Reviewer reviews again
- Repeat until approved
- Don't skip the re-review

## Integration

- `/superpowers:worktree` — set up isolated workspace before starting
- `/superpowers:write-plan` — creates the plan this template executes
- `/superpowers:finish-branch` — complete development after all tasks
- `/superpowers:tdd` — subagents follow TDD for each task
