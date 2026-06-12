---
name: coding
description: "Use before starting work on any coding task: implementing a feature, fixing a bug, refactoring, or changing code. Drives the complete implementation."
---

# Coding

Drive a coding task from goal to implementation. Plan first in an isolated context, then implement once the user approves.

## Workflow

### 1. Understand the goal

Explore enough to ask good questions. Restate the goal in your own words and
confirm it with the user before planning.

### 2. Delegate the plan

Invoke a subagent to research and plan in an isolated context:

```
subagent {
  model: "<model>",   # optional; omit to inherit the default model
  task: "Load the plan skill and produce a plan for: <confirmed goal>"
}
```

The subagent researches the codebase, writes the plan to a tmp file, and returns
the file path plus a short summary.

### 3. Present

Relay the subagent's summary to the user. Communicate succinctly:
- high level steps so the user understands what is changing and why
- architectural changes if any
- public interface changes
- breaking changes

Keep it brief but complete at a conceptual level so the user can review without
reading the plan file or specific code changes.

### 4. Iterate

On feedback, read the plan file and edit it directly. Do not re-invoke the
subagent. Do not assume the user or the plan is right: re-check the code,
documentation, or research online as needed.

### 5. Implement

When the user approves the plan, implement it:
- Follow existing patterns in the codebase; read similar code first, match conventions
- Make changes incrementally, one logical unit at a time
- Test as you go; fix failures immediately
- Do what the plan says, nothing more
