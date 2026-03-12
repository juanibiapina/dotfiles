---
description: Complete development — verify tests, present merge/PR/keep/discard options, clean up
---

# Finishing a Development Branch

Guide completion of development work by presenting clear options and handling the chosen workflow.

**Core principle:** Verify tests → Present options → Execute choice → Clean up.

## Context

$ARGUMENTS

## The Process

### Step 1: Verify Tests

Before presenting options, verify tests pass:

```bash
# Run project's test suite
npm test / cargo test / pytest / go test ./...
```

**If tests fail:** Report failures, stop. Cannot proceed until tests pass.

**If tests pass:** Continue to Step 2.

### Step 2: Determine Base Branch

```bash
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```

Or ask: "This branch split from main — is that correct?"

### Step 3: Present Options

Present exactly these 4 options:

> Implementation complete. What would you like to do?
>
> 1. Merge back to `<base-branch>` locally
> 2. Push and create a Pull Request
> 3. Keep the branch as-is (I'll handle it later)
> 4. Discard this work

### Step 4: Execute Choice

#### Option 1: Merge Locally

```bash
git checkout <base-branch>
git pull
git merge <feature-branch>
# Verify tests on merged result
git branch -d <feature-branch>
```

Then: clean up worktree (Step 5).

#### Option 2: Push and Create PR

```bash
git push -u origin <feature-branch>
gh pr create --title "<title>" --body "## Summary
- <what changed>

## Test Plan
- [ ] <verification steps>"
```

Then: clean up worktree (Step 5).

#### Option 3: Keep As-Is

Report: "Keeping branch `<name>`. Worktree preserved at `<path>`."

Do NOT clean up worktree.

#### Option 4: Discard

**Confirm first:**

> This will permanently delete:
> - Branch `<name>`
> - All commits: `<commit-list>`
> - Worktree at `<path>`
>
> Type 'discard' to confirm.

Wait for exact confirmation. Then:

```bash
git checkout <base-branch>
git branch -D <feature-branch>
```

Then: clean up worktree (Step 5).

### Step 5: Cleanup Worktree

For Options 1, 2, and 4 — check if in worktree and remove:

```bash
git worktree list | grep $(git branch --show-current)
git worktree remove <worktree-path>
```

For Option 3: keep worktree.

## Red Flags

**Never:**
- Proceed with failing tests
- Merge without verifying tests on result
- Delete work without confirmation
- Force-push without explicit request

**Always:**
- Verify tests before offering options
- Present exactly 4 options
- Get typed confirmation for Option 4
- Clean up worktree for Options 1 & 4 only
