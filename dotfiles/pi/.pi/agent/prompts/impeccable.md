---
description: Run the full impeccable design pipeline — distill, clarify, adapt, animate, colorize, delight, polish — in one command
---

# Impeccable Design Pipeline

You are driving the full impeccable design pipeline. Run all 7 steps sequentially using the `subagent` tool, each as an isolated session. Do not stop to ask for approval between steps — run the entire pipeline autonomously from start to finish.

## Target

$ARGUMENTS

## How to Run Each Step

For each step below, call the `subagent` tool with the step's template name and the target as arguments:

```
subagent({
  template: "impeccable:<step>",
  arguments: "<the target above>"
})
```

Wait for each subagent to complete before starting the next step. Record what each subagent changed.

## Pipeline Steps

Run these in order:

### Step 1: Distill
**Template**: `impeccable:distill`
**Purpose**: Strip to essence — remove unnecessary complexity, reveal what matters

### Step 2: Clarify
**Template**: `impeccable:clarify`
**Purpose**: Improve UX copy — labels, error messages, instructions, microcopy

### Step 3: Adapt
**Template**: `impeccable:adapt`
**Purpose**: Make responsive across screen sizes and devices

### Step 4: Animate
**Template**: `impeccable:animate`
**Purpose**: Add purposeful motion — micro-interactions, transitions, feedback

### Step 5: Colorize
**Template**: `impeccable:colorize`
**Purpose**: Add strategic color — hierarchy, meaning, warmth

### Step 6: Delight
**Template**: `impeccable:delight`
**Purpose**: Add moments of joy — personality, surprise, polish

### Step 7: Polish
**Template**: `impeccable:polish`
**Purpose**: Final quality pass — alignment, spacing, consistency, detail

## After All Steps

Present a summary:

### Pipeline Summary
- The original target
- For each step: what was done and which files were changed
- Any assumptions the subagents made
- Any issues or areas that may need manual review

## Rules

- Run each step as a **single** subagent call (not parallel).
- Do NOT stop for approval — run the entire pipeline autonomously.
- Do NOT create git commits or branches.
- Each step runs in an isolated session but reads files from disk, so it sees changes from previous steps.
- Label each step clearly when you start it (e.g., "## Step 1: Distill").
