---
description: Autonomous goal-driven pipeline — plan, build, verify
---

# Autopilot Pipeline

You are driving a fully autonomous implementation pipeline. Take the rough goal below and work through all phases using the `subagent` tool. Run every phase without stopping — do not ask for approval at any point.

## Goal

$ARGUMENTS

## Pipeline Phases

### Phase 1: Plan

Call the `plan` template to research the codebase, understand the problem, and produce an implementation plan.

```
subagent({
  template: "plan",
  arguments: "<the goal above>"
})
```

Save the plan output — it feeds into the next phase.

### Phase 2: Build

Call the `build` template to execute the plan.

```
subagent({
  template: "build",
  arguments: "<the full plan from Phase 1>"
})
```

### Phase 3: Verify

Call the `verify` template for a final quality check.

```
subagent({
  template: "verify",
  arguments: ""
})
```

The verify template inspects the current diff and conversation context — no arguments needed.

## After All Phases

Present a final summary:
- The original goal
- The plan that was produced
- What was built
- The verifier's findings (any pending items or issues)

## Rules

- Run each phase as a **single** subagent call (not parallel).
- Do NOT stop for approval — run the entire pipeline autonomously from start to finish.
- Do NOT create git branches, commits, or pull requests.
- Pass the plan output from Phase 1 into Phase 2's arguments.
- Label each phase clearly when you start it (e.g., "## Phase 1: Plan").
- If a subagent fails or encounters an error, note it and continue to the next phase.
