---
description: Request code review via subagent to catch issues before they cascade
---

# Requesting Code Review

Dispatch a `superpowers:code-reviewer` subagent to catch issues before they cascade. The reviewer gets precisely crafted context — never your session's history.

## What to Review

$ARGUMENTS

## When to Request Review

**Mandatory:**
- After each task in subagent-driven development
- After completing a major feature
- Before merge to main

**Optional but valuable:**
- When stuck (fresh perspective)
- Before refactoring (baseline check)
- After fixing a complex bug

## How to Request

### 1. Get git SHAs

```bash
BASE_SHA=$(git rev-parse HEAD~1)  # or origin/main
HEAD_SHA=$(git rev-parse HEAD)
```

### 2. Dispatch code-reviewer subagent

```
subagent({
  template: "superpowers:code-reviewer",
  arguments: "What: <what you just built>\nPlan: <what it should do, or path to plan>\nBase: <BASE_SHA>\nHead: <HEAD_SHA>\nDescription: <brief summary>"
})
```

### 3. Act on feedback

- Fix **Critical** issues immediately
- Fix **Important** issues before proceeding
- Note **Minor** issues for later
- Push back if reviewer is wrong (with reasoning)

## Integration with Workflows

**Subagent-driven development:** Review after EACH task. Catch issues before they compound.

**Executing plans:** Review after each batch (~3 tasks). Get feedback, apply, continue.

**Ad-hoc development:** Review before merge, or when stuck.

## Red Flags

**Never:**
- Skip review because "it's simple"
- Ignore Critical issues
- Proceed with unfixed Important issues
- Argue with valid technical feedback

**If reviewer is wrong:**
- Push back with technical reasoning
- Show code/tests that prove it works
- Request clarification
