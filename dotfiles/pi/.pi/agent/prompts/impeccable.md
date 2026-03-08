---
description: Run the full impeccable design pipeline — distill, clarify, adapt, animate, colorize, delight, polish — in one command
---

# Impeccable Design Pipeline

You are driving the full impeccable design pipeline. Run all 7 steps sequentially using the `subagent` tool, each as an isolated `worker` call. Do not stop to ask for approval between steps — run the entire pipeline autonomously from start to finish.

> **Tip**: For best results, run `/impeccable:teach` first to persist design context to AGENTS.md. The pipeline infers context from the codebase, but explicit design context produces better decisions.

## Target

$ARGUMENTS

## How to Run Each Step

For each step below:

1. Read the prompt template file from `~/.pi/agent/prompts/` (e.g., `~/.pi/agent/prompts/impeccable:distill.md`)
2. Take the file content and replace `$ARGUMENTS` with the target above
3. Prepend the following override to the task:

> **AUTOMATED PIPELINE OVERRIDE**: This step is running as part of an automated pipeline. Do NOT stop to ask the user questions. Instead:
> - Gather all context from the codebase, AGENTS.md, and existing design/functionality
> - Use your best judgment to infer target audience, brand personality, use cases, and design intent
> - If context is ambiguous, make a reasonable choice and note your assumption
> - Proceed through the entire step without stopping
> - Do NOT create git commits

4. Send the combined task to a **worker** subagent (single mode, not chain)
5. Wait for the worker to complete before starting the next step
6. Record what the worker changed

## Pipeline Steps

Run these in order:

### Step 1: Distill
**File**: `~/.pi/agent/prompts/impeccable:distill.md`
**Purpose**: Strip to essence — remove unnecessary complexity, reveal what matters

### Step 2: Clarify
**File**: `~/.pi/agent/prompts/impeccable:clarify.md`
**Purpose**: Improve UX copy — labels, error messages, instructions, microcopy

### Step 3: Adapt
**File**: `~/.pi/agent/prompts/impeccable:adapt.md`
**Purpose**: Make responsive across screen sizes and devices

### Step 4: Animate
**File**: `~/.pi/agent/prompts/impeccable:animate.md`
**Purpose**: Add purposeful motion — micro-interactions, transitions, feedback

### Step 5: Colorize
**File**: `~/.pi/agent/prompts/impeccable:colorize.md`
**Purpose**: Add strategic color — hierarchy, meaning, warmth

### Step 6: Delight
**File**: `~/.pi/agent/prompts/impeccable:delight.md`
**Purpose**: Add moments of joy — personality, surprise, polish

### Step 7: Polish
**File**: `~/.pi/agent/prompts/impeccable:polish.md`
**Purpose**: Final quality pass — alignment, spacing, consistency, detail

## After All Steps

Present a summary:

### Pipeline Summary
- The original target
- For each step: what was done and which files were changed
- Any assumptions the workers made
- Any issues or areas that may need manual review

## Rules

- Run each step as a **single** subagent call (not chain mode).
- Do NOT stop for approval — run the entire pipeline autonomously.
- Do NOT create git commits or branches.
- Each step reads files from disk, so it sees changes from previous steps.
- Label each step clearly when you start it (e.g., "## Step 1: Distill").
- If a step fails, note the error and continue to the next step.
