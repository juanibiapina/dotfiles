---
description: Pre-commit/pre-merge checklist to catch loose ends before finalizing changes
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

- Review the conversation intent
- Check `git diff`
- Check `git diff --cached`
- If needed, check `git diff main...HEAD`
- Read the full diff before judging it

### 2. Review

Check for:
- test gaps and missing edge cases
- incomplete renames or stale concepts
- docs that no longer match
- TODOs, debug code, dead code, placeholders
- pattern or style mismatches

### 3. Report

Return follow-up items as:
- **Must fix**
- **Should fix**
- **Nice to have**

Each item must include the file path, line number or range, and what to do.

If everything looks clean, say so.
