---
name: work-pulse
description: Use when asked to create a focused work pulse, sprint, or recurring cron for a specific project or task. Triggers on "create a pulse", "set up a pulse", "work pulse for X".
---

# Work Pulse

Set up a self-destructing cron pulse that works on a focused goal. The pulse runs on a schedule, picks up the next task each time, and deletes itself when done.

## What to Create

Three things, all in the notes `zero/` directory:

1. **Project note** (`projects/<slug>.md`): goal, context, and a task checklist.
2. **Pulse prompt** (`<slug>-pulse.md`): the prompt the cron runs each tick.
3. **Cron job** (via `add_cron`): triggers the pulse on schedule.

Then update `schedule.md` and `projects/index.md` to reflect the new pulse.

## Naming

Derive a short slug from the project name. Use it consistently:
- Project note: `projects/<slug>.md`
- Pulse prompt: `<slug>-pulse.md`
- Cron name: `<slug>-pulse`

## Project Note

A project note has: title, status, context (repo, live URL, related notes), goal, and a task checklist. Tasks should be ordered so the pulse can work through them sequentially. Include a research/planning task first if the scope isn't fully defined yet.

## Pulse Prompt

The pulse prompt follows this structure:

```
You are Zero. This is a **work pulse** for <project description>. There is no user message.

Read your identity note Zero.md for context.

## Purpose
<One-line description of the goal.>

## Project
Read `projects/<slug>.md` for full scope and task list.

## Workflow
1. Read the project note. Check what's done and what's next.
2. Pick the next unchecked task. Work through them in order.
3. Do it. Complete the task. Check it off in <slug>.md.
4. Review. After completing a task, verify the work is coherent.
5. When all tasks are done: delete this cron with `delete_cron` name `<slug>-pulse`. Do NOT re-add it.

## Constraints
<Project-specific constraints: repo location, branch strategy, style rules, etc.>
```

Adapt the workflow and constraints to the project. Some pulses need state files, wrap-up emails, or PR opening as a final step. Add what makes sense, skip what doesn't.

## Cron Setup

- Default interval: `*/1 * * * *` (every minute) unless the user specifies otherwise.
- Working directory: `/home/juan/Sync/notes/zero`
- Prompt file: `<slug>-pulse.md`
- Chat ID and topic ID: use the standard Telegram values from `schedule.md`.

## Self-Destruction

Every pulse must delete its own cron when the work is complete. This is the last step in the pulse workflow. The condition for "done" depends on the project: all tasks checked, PR opened, email sent, etc. Make it explicit in both the pulse prompt and the project note.
