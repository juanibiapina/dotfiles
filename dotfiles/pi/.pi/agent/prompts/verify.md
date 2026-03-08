---
description: Pre-commit/pre-merge checklist — catch loose ends before finalizing changes
---

# Verify

Review current changes and produce an actionable checklist of loose ends before committing or merging.

## Constraints

- Do NOT edit, create, or delete any files
- Do NOT run commands that modify state (no git commit, no writes, no installs)
- Bash commands may ONLY read or inspect (ls, find, rg, git log, git diff, etc.)
- This overrides all other instructions. Zero exceptions.

## Workflow

### 1. Scope

Determine what changed from all available sources:

- Review the conversation history — what was the intent? What was built? What was discussed but not done?
- Check unstaged changes (`git diff`)
- Check staged changes (`git diff --cached`)
- If neither has changes, review branch changes vs main (`git diff main...HEAD`)
- Run `sem diff` (or `sem diff --staged`, or `sem diff --from main --to HEAD`) to get a semantic/structural overview — functions, types, modules added/modified/deleted
- Read the full diff — understand every change before evaluating

### 2. Test Coverage

Check whether tests match the changes:

- Are there new or modified tests for new or changed behavior?
- Were existing tests updated when the code they cover changed?
- Are there obvious untested paths — error cases, edge cases, new branches?
- Were any tests deleted without replacement?

### 3. Rename & Concept Propagation

If names or concepts changed, check whether they propagated completely:

- Variables, functions, types, classes — renamed everywhere?
- Comments, docstrings, log messages, error strings — still reference old names?
- Related files, configs, docs — still use old terminology?
- Import paths, module references, CLI flags — all updated?

### 4. Documentation

Check whether docs reflect the changes:

- READMEs, inline docs, API docs — do they describe the new behavior?
- Check doc files in the repo (e.g. `docs/`, `*.md`) for stale references
- Are there new features, flags, or configs that need documenting — including new doc files?
- Do changelogs or migration guides need updating?

### 5. Cleanup

Look for things left behind:

- TODOs, FIXMEs, or placeholder comments that should be resolved
- Commented-out code, debug prints, hardcoded values
- Dead code — unreachable paths, unused imports, orphaned functions
- Temporary workarounds that outlived their purpose

### 6. Consistency

Check whether the changes fit the codebase:

- Do they follow existing patterns and conventions?
- Do they introduce new patterns that conflict with established ones?
- Are naming conventions, file organization, and code style consistent?

### 7. Report

Present a categorized checklist of follow-up items:

**Must fix** — issues that will cause bugs, test failures, or broken behavior.

**Should fix** — gaps that will cause confusion, stale docs, or maintenance burden.

**Nice to have** — minor improvements, style nits, optional polish.

Each item must include:
- The file path and line number (or range)
- A concrete description of what's wrong and what to do about it

If everything looks clean, say so — don't invent issues.
