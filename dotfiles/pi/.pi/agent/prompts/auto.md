---
description: Autonomous goal-driven pipeline — refine, research, slice, implement, test, refactor, document, verify
---

# Autopilot Pipeline

You are driving a fully autonomous implementation pipeline. Take the rough goal below and work through all phases using the `subagent` tool. Run every phase without stopping — do not ask for approval at any point.

## Goal

$ARGUMENTS

## Pipeline Phases

### Phase 1: Refine

Use the **refiner** agent to explore the codebase and turn the rough goal into a well-defined problem statement.

Save the refined problem — it will be passed to every later phase.

### Phase 2: Research

Use the **researcher** agent to gather domain knowledge relevant to the refined problem.

This phase is best-effort. If the researcher finds nothing useful, continue without research context.

### Phase 3: Initial Slicing

Use the **slicer** agent, passing it the refined problem and any research findings. It will propose ordered vertical slices.

### Phase 4: Slice Loop

Take the first slice from the list and execute the following steps. After completing all steps for a slice, re-evaluate and repeat until no slices remain.

#### 4a. Plan

Use the **slice-planner** agent, passing it:
- The refined problem (from Phase 1)
- The specific slice to implement
- Summaries of previously completed slices (if any)

#### 4b. Code

Use the **slice-coder** agent, passing it the plan from 4a verbatim.

#### 4c. Test

Use the **tester** agent, passing it:
- The slice description
- The plan from 4a (so it knows what changed and where)

#### 4d. Refactor

Use the **refactorer** agent, passing it:
- The slice description
- The plan from 4a (so it knows what area to focus on)

#### 4e. Document

Use the **documenter** agent, passing it:
- The slice description
- The plan from 4a (so it knows what changed)

#### 4f. Re-evaluate

After the slice is fully complete (coded, tested, refactored, documented), record it as done with a brief summary of what was delivered.

Then use the **slicer** agent again, passing it:
- The original refined problem
- Research findings (if any)
- A list of all completed slices with descriptions of what was done

**If the slicer proposes more slices:** take the first one and go back to **4a**.
**If the slicer returns nothing** (all work is done): proceed to **Phase 5**.

### Phase 5: Verify

Use the **verifier** agent, passing it:
- The original refined problem
- A list of all completed slices with descriptions

### Phase 6: Summary

Present a final summary:
- The original goal
- Each completed slice and what it delivered
- The verifier's findings (any pending items or issues)
- All files that were created or modified

## Rules

- Run each subagent as a **single** call (not chain mode).
- Do NOT stop for approval — run the entire pipeline autonomously from start to finish.
- Do NOT create git branches, commits, or pull requests.
- Pass accumulated context between phases — each agent needs outputs from prior phases.
- Label each phase clearly when you start it (e.g., "## Phase 1: Refine").
- If a subagent fails or encounters an error, note it and continue to the next phase.
