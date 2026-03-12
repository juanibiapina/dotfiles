---
description: Execute an implementation plan in the current session with review checkpoints
---

# Executing Plans

Load plan, review critically, execute all tasks, report when complete.

**Note:** Superpowers works much better with subagents. Consider using `/superpowers:subagent-dev` instead for higher quality results (fresh subagent per task + two-stage review).

## Plan

$ARGUMENTS

## The Process

### Step 1: Load and Review Plan

1. Read the plan file
2. Review critically — identify any questions or concerns about the plan
3. If concerns: raise them with the user before starting
4. If no concerns: track tasks and proceed

### Step 2: Execute Tasks

For each task:
1. Mark as in progress
2. Follow each step exactly (plan has bite-sized steps)
3. Run verifications as specified
4. Mark as completed

### Step 3: Complete Development

After all tasks complete and verified:
- Use `/superpowers:finish-branch` to verify tests, present merge/PR/keep/discard options

## When to Stop and Ask for Help

**STOP executing immediately when:**
- Hit a blocker (missing dependency, test fails, instruction unclear)
- Plan has critical gaps preventing starting
- You don't understand an instruction
- Verification fails repeatedly

**Ask for clarification rather than guessing.**

## When to Revisit Earlier Steps

**Return to Review (Step 1) when:**
- User updates the plan based on your feedback
- Fundamental approach needs rethinking

**Don't force through blockers** — stop and ask.

## Remember

- Review plan critically first
- Follow plan steps exactly
- Don't skip verifications
- Stop when blocked, don't guess
- Never start implementation on main/master branch without explicit user consent

## Integration

- `/superpowers:worktree` — set up isolated workspace before starting
- `/superpowers:write-plan` — creates the plan this template executes
- `/superpowers:finish-branch` — complete development after all tasks
