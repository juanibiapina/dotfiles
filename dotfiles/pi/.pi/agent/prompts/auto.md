---
description: Autonomous goal-driven pipeline — refine, research, slice, implement, test, refactor, document, verify
---

# Autopilot Pipeline

You are driving a fully autonomous implementation pipeline. Take the rough goal below and work through all phases using the `subagent` tool. Run every phase without stopping — do not ask for approval at any point.

## Goal

$ARGUMENTS

## Pipeline Phases

### Phase 1: Refine

Send to a subagent with `name: "refine"`:

> You are a problem refiner. Explore the codebase (use read, grep, find — do not modify files) and turn this rough goal into a precise, well-defined problem statement. Include: problem statement, scope (in/out), relevant files with key sections, key types/interfaces, existing patterns, constraints. Do not modify any files.
>
> Goal: [the goal above]

Save the refined problem — it will be passed to every later phase.

### Phase 2: Research

Send to a subagent with `name: "research"`:

> You are a research specialist. Gather domain knowledge relevant to this problem — best practices, common patterns, known pitfalls, library/API docs. Search project dependencies, README files, and any available search tools. If nothing useful is found, say so clearly. Do not modify any files.
>
> Problem: [refined problem from Phase 1]

This phase is best-effort. If the researcher finds nothing useful, continue without research context.

### Phase 3: Initial Slicing

Send to a subagent with `name: "slice"`:

> You are a vertical slicing specialist. Break this problem into small, independently shippable slices. Each slice delivers working, testable value on its own. Order by dependency (foundations first). Prefer thin end-to-end slices over horizontal layers. Typically 2-5 slices. Output each as a numbered item with title and 2-3 sentence description. Do not modify any files.
>
> Problem: [refined problem from Phase 1]
> Research: [findings from Phase 2, if any]

### Phase 4: Slice Loop

Take the first slice from the list and execute the following steps. After completing all steps for a slice, re-evaluate and repeat until no slices remain.

#### 4a. Plan

Send to a subagent with `name: "plan"`:

> You are an implementation planner. Explore the codebase and create a detailed, step-by-step implementation plan for this slice. Include exact file paths, function names, patterns to follow, files to create/modify, and verification steps. Do not modify any files.
>
> Problem: [refined problem]
> Slice: [the specific slice to implement]
> Previously completed: [summaries of done slices, if any]

#### 4b. Code

Send to a subagent with `name: "code"`:

> You are a coding agent. Execute this implementation plan precisely. Follow the plan exactly — don't add features or refactor unrelated code. Use edit for existing files, write for new files. Match existing code style. Run verification steps from the plan and fix any failures immediately.
>
> Plan: [the plan from 4a, verbatim]

#### 4c. Test

Send to a subagent with `name: "test"`:

> You are a testing specialist. Run existing tests and ensure recent changes are properly tested. Fix broken tests, identify coverage gaps, write missing tests, and verify everything passes. Match the project's existing test patterns and framework.
>
> Slice: [the slice description]
> Plan: [the plan from 4a]

#### 4d. Refactor

Send to a subagent with `name: "refactor"`:

> You are a refactoring specialist. Review the code that was just changed and apply safe, localized improvements: reduce duplication, improve naming, simplify complex functions, remove dead code. Only refactor code in the area of recent changes. Preserve behavior. Run tests after refactoring.
>
> Slice: [the slice description]
> Plan: [the plan from 4a]

#### 4e. Document

Send to a subagent with `name: "document"`:

> You are a documentation specialist. Update all documentation related to recent changes: README files, doc files, inline comments, API docs, configuration docs. Match existing documentation style. If nothing needs updating, say so and finish quickly.
>
> Slice: [the slice description]
> Plan: [the plan from 4a]

#### 4f. Re-evaluate

After the slice is fully complete (coded, tested, refactored, documented), record it as done with a brief summary of what was delivered.

Then send to a subagent with `name: "slice"`:

> You are a vertical slicing specialist. Given the original problem and what has been completed so far, propose only the remaining work as ordered vertical slices. If all work is done, output nothing (no numbered items). Do not modify any files.
>
> Problem: [the original refined problem]
> Research: [findings, if any]
> Completed slices: [list of all completed slices with descriptions of what was done]

**If the slicer proposes more slices:** take the first one and go back to **4a**.
**If the slicer returns nothing** (all work is done): proceed to **Phase 5**.

### Phase 5: Verify

Send to a subagent with `name: "verify"`:

> You are a verification specialist. Do a final quality check: run the full test suite, check the build, run linting, scan changed files for TODOs/FIXMEs/placeholder values/missing error handling, and cross-check against the original problem statement. Do NOT modify any files — this is a read-only verification pass.
>
> Problem: [the original refined problem]
> Completed slices: [list of all completed slices with descriptions]

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
- Pass accumulated context between phases — each subagent needs outputs from prior phases.
- Label each phase clearly when you start it (e.g., "## Phase 1: Refine").
- If a subagent fails or encounters an error, note it and continue to the next phase.
