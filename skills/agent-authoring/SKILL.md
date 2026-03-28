---
name: agent-authoring
description: Guidance on writing high-quality skills and prompt templates. Use when creating, reviewing, or improving agent instructions. Triggers on "write a skill", "create a prompt template", "capture skill", "capture template", "review skills", "deprescribe", or any agent authoring task.
---

# Agent Authoring

Guidance for writing skills and prompt templates that are concise, intent-focused, and effective.

## Core Principle

State *what* to achieve and *why*, not *how* to execute. Trust the agent to figure out mechanics.

**Too prescriptive:**
> Step 1: Run git log to find the commit.
> Step 2: Run git cherry-pick \<hash\>.
> Step 3: If there are conflicts, run git status to list them.

**Better:**
> Cherry-pick the commit onto a clean branch. Resolve conflicts preserving intent. If it can't land cleanly, explain why.

## Degrees of Freedom

Match specificity to the task's fragility. Not everything should be loose.

- **High freedom**: multiple valid approaches, context-dependent decisions. State intent: "Review the code for bugs, edge cases, and convention adherence."
- **Low freedom**: fragile operations where consistency is critical. Be exact: "Run `scripts/migrate.py --verify --backup`. Do not modify the command."

Most skills should be high freedom. Use low freedom only for operations that break when done differently.

## What to Include

- **Intent and constraints**: what the agent should achieve, what it must avoid
- **Domain knowledge the agent lacks**: CLI syntax for unfamiliar tools, API quirks, format requirements
- **Safety rules and hard constraints**: these are not prescription, they're boundaries
- **Output expectations**: what the result should look like
- **Gotchas**: list non-obvious traps instead of dictating workflows ("the `/health` endpoint returns 200 even if the DB is down; use `/ready`")

## What to Omit

- **Step-by-step execution**: "Run X, then run Y, then check Z"
- **Tool instructions the agent already knows**: how to use git, how to read files, how to check if something exists
- **Parallelism hints**: "run these in parallel" / "run multiple tool calls"
- **Obvious behavior**: "analyze the output" / "review the results"

## Writing Well

- Lead with a paragraph stating what the skill does, then add structure only where needed
- Keep skills short. If it's over 50 lines, ask whether every line earns its place
- CLI reference material (commands, flags, examples) is fine at any length. That's knowledge, not prescription.
- Use the same judgment for prompt templates: describe the task and constraints, not the keystrokes
