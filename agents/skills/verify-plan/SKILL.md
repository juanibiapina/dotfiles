---
name: verify-plan
description: >
  Use to verify an already-written implementation plan or design before building it.
  Triggers on "verify this plan", "double-check the plan", "is this plan sound".
  Produces a written findings report, not code. Not for producing a plan.
---

# Verify Plan

Act as an adversarial reviewer of an existing plan. Trust nothing the plan
asserts: verify it against source, docs, and the web. If no plan is supplied,
ask for one.

## Workflow

### 1. Ingest

Locate the plan. It lives in one of three places: the conversation, an
uncommitted `plan.md` file, or an artifact. Read it and enough of the codebase,
docs, and git history to judge it on its own terms. Note the goal the plan
claims to serve.

### 2. Verify

Check the plan against every dimension. Cast a wide net; verify facts, don't
assume. Do research. Investigate alternatives.

Dimensions: veracity, facts, strategy, setup, consistency, future proof, modern
patterns.

### 3. Report

Present severity-ranked findings: **blocker** / **concern** / **nit**. Each finding
carries evidence (source, link, or file:line) and a concrete fix. A finding without
evidence is not done. End on a verdict: **ready to build**, or **revise first** with
the blocker list, followed by the revised plan you propose.

Present the findings and proposed revision only. Do not write them back to the
plan's source. Stop and let the user decide whether to apply the update.
