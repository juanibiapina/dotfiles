---
description: Dispatch 2+ independent tasks to concurrent subagents for parallel execution
---

# Dispatching Parallel Agents

Delegate independent tasks to specialized subagents with isolated context. Each gets precisely crafted instructions — never your session's history.

## Tasks

$ARGUMENTS

## When to Use

**Use when:**
- 2+ tasks with different root causes or domains
- Each task can be understood without context from others
- No shared state between tasks

**Don't use when:**
- Tasks are related (fix one might fix others)
- Need to understand full system state first
- Subagents would edit the same files

## The Pattern

### 1. Identify Independent Domains

Group work by what's independent:
- File A tests: tool approval flow
- File B tests: batch completion behavior
- File C tests: abort functionality

Each domain is independent — fixing one doesn't affect the others.

### 2. Create Focused Subagent Tasks

Each subagent gets:
- **Specific scope:** one file or subsystem
- **Clear goal:** what to accomplish
- **Constraints:** what NOT to change
- **Expected output:** what to report back

### 3. Dispatch in Parallel

```
subagent({
  tasks: [
    {
      template: "superpowers:implementer",
      arguments: "Fix agent-tool-abort.test.ts failures:\n1. 'should abort tool...' - expects 'interrupted at'\n2. ...\n\nScope: Only this file. Return summary of findings and fixes."
    },
    {
      template: "superpowers:implementer",
      arguments: "Fix batch-completion-behavior.test.ts failures:\n1. ...\n\nScope: Only this file. Return summary of findings and fixes."
    },
    {
      template: "superpowers:implementer",
      arguments: "Fix tool-approval-race-conditions.test.ts failures:\n1. ...\n\nScope: Only this file. Return summary of findings and fixes."
    }
  ]
})
```

### 4. Review and Integrate

When subagents return:
1. Read each summary — understand what changed
2. Check for conflicts — did subagents edit the same code?
3. Run full test suite — verify all fixes work together
4. Spot check — subagents can make systematic errors

## Agent Prompt Structure

Good subagent prompts are:
1. **Focused** — one clear problem domain
2. **Self-contained** — all context needed to understand the problem
3. **Specific about output** — what should the subagent return?

**Common mistakes:**
- ❌ Too broad: "Fix all the tests" — subagent gets lost
- ✅ Specific: "Fix agent-tool-abort.test.ts" — focused scope
- ❌ No context: "Fix the race condition" — where?
- ✅ Context: paste the error messages and test names
- ❌ No constraints: subagent might refactor everything
- ✅ Constraints: "Do NOT change production code" or "Fix tests only"

## When NOT to Use

- **Related failures:** investigate together first
- **Exploratory debugging:** you don't know what's broken yet
- **Shared state:** subagents would interfere (editing same files)

## Key Benefits

1. **Parallelization** — multiple investigations run simultaneously
2. **Focus** — each subagent has narrow scope
3. **Independence** — subagents don't interfere
4. **Speed** — N problems solved in time of 1
