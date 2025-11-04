#!/usr/bin/env bash
#
# Pre-work script: Gather all information about a Jira ticket
# Usage: pre-work.sh <jira-url>
#
# This script:
# 1. Extracts ticket ID from Jira URL
# 2. Checks git worktree is clean
# 3. Runs dev clear to reset environment
# 4. Fetches ticket information
# 5. Fetches parent hierarchy
# 6. Fetches subtasks
#
# All output is printed to stdout for LLM processing

set -e

jira_url="$1"

if [ -z "$jira_url" ]; then
  echo "Error: Jira URL required"
  echo "Usage: $0 <jira-url>"
  exit 1
fi

# Extract ticket ID from URL
# Supports URLs like: https://contentful.atlassian.net/browse/NT-1764
if [[ "$jira_url" =~ /browse/([A-Z]+-[0-9]+) ]]; then
  ticket_id="${BASH_REMATCH[1]}"
else
  echo "Error: Invalid Jira URL format"
  echo "Expected format: https://contentful.atlassian.net/browse/TICKET-123"
  exit 1
fi

echo "=========================================="
echo "TICKET: $ticket_id"
echo "=========================================="
echo

# Check for clean worktree
echo "--- GIT STATUS CHECK ---"
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
  echo "ERROR: Git worktree is not clean"
  echo
  git status --short
  echo
  echo "Please commit or stash your changes before starting new work"
  exit 1
fi
echo "✓ Git worktree is clean"
echo

# Run dev clear
echo "--- RUNNING DEV CLEAR ---"
dev clear
echo "✓ Environment reset complete"
echo

# Fetch ticket information
echo "--- TICKET INFORMATION ---"
jira issue view "$ticket_id"
echo

# Fetch parent hierarchy
echo "--- PARENT HIERARCHY ---"
if dev jira parents "$ticket_id" 2>/dev/null; then
  echo
else
  echo "No parent issues"
  echo
fi

# Fetch subtasks
echo "--- SUBTASKS ---"
if dev jira subtasks "$ticket_id" 2>/dev/null; then
  echo
else
  echo "No subtasks"
  echo
fi

echo "=========================================="
echo "DATA GATHERING COMPLETE"
echo "=========================================="
