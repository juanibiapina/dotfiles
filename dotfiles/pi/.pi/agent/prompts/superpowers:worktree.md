---
description: Create an isolated git worktree workspace for feature work
---

# Using Git Worktrees

Git worktrees create isolated workspaces sharing the same repository, allowing work on multiple branches simultaneously without switching.

## Feature

$ARGUMENTS

## Directory Selection Process

Follow this priority order:

### 1. Check Existing Directories

```bash
ls -d .worktrees 2>/dev/null     # Preferred (hidden)
ls -d worktrees 2>/dev/null      # Alternative
```

If found, use that directory. If both exist, `.worktrees` wins.

### 2. Check AGENTS.md

```bash
grep -i "worktree.*director" AGENTS.md 2>/dev/null
```

If preference specified, use it without asking.

### 3. Ask User

If no directory exists and no AGENTS.md preference:

> No worktree directory found. Where should I create worktrees?
>
> 1. `.worktrees/` (project-local, hidden)
> 2. `~/.config/superpowers/worktrees/<project-name>/` (global location)

## Safety Verification

For project-local directories, verify the directory is git-ignored before creating:

```bash
git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null
```

**If NOT ignored:** Add to `.gitignore` and commit before proceeding. This prevents accidentally committing worktree contents.

For global directory (`~/.config/superpowers/worktrees`): no verification needed — outside project entirely.

## Creation Steps

### 1. Detect Project Name

```bash
project=$(basename "$(git rev-parse --show-toplevel)")
```

### 2. Create Worktree

```bash
# For project-local
git worktree add ".worktrees/$BRANCH_NAME" -b "$BRANCH_NAME"

# For global
git worktree add "$HOME/.config/superpowers/worktrees/$project/$BRANCH_NAME" -b "$BRANCH_NAME"
```

### 3. Run Project Setup

Auto-detect and run:
- `package.json` → `npm install`
- `Cargo.toml` → `cargo build`
- `requirements.txt` → `pip install -r requirements.txt`
- `pyproject.toml` → `poetry install`
- `go.mod` → `go mod download`

### 4. Verify Clean Baseline

Run tests to ensure worktree starts clean. If tests fail, report failures and ask whether to proceed or investigate.

### 5. Report

```
Worktree ready at <full-path>
Tests passing (<N> tests, 0 failures)
Ready to implement <feature-name>
```

## Quick Reference

| Situation | Action |
|-----------|--------|
| `.worktrees/` exists | Use it (verify ignored) |
| `worktrees/` exists | Use it (verify ignored) |
| Both exist | Use `.worktrees/` |
| Neither exists | Check AGENTS.md → ask user |
| Directory not ignored | Add to .gitignore + commit |
| Tests fail at baseline | Report failures + ask |
| No package.json etc. | Skip dependency install |

## Red Flags

**Never:**
- Create worktree without verifying it's ignored (project-local)
- Skip baseline test verification
- Proceed with failing tests without asking
- Assume directory location when ambiguous

**Always:**
- Follow directory priority: existing → AGENTS.md → ask
- Auto-detect and run project setup
- Verify clean test baseline
