#!/usr/bin/env bash
#
# Post-work script: Execute state changes for starting work
# Usage: post-work.sh <ticket-id> <branch-name>
#
# This script:
# 1. Transitions Jira ticket to "In Progress"
# 2. Creates and checks out the feature branch
# 3. Shows success summary

set -e

ticket_id="$1"
branch_name="$2"

if [ -z "$ticket_id" ] || [ -z "$branch_name" ]; then
  echo "Error: ticket-id and branch-name required"
  echo "Usage: $0 <ticket-id> <branch-name>"
  exit 1
fi

echo "=========================================="
echo "EXECUTING CHANGES"
echo "=========================================="
echo

# Transition ticket to In Progress
echo "--- TRANSITIONING TICKET ---"
if jira issue move "$ticket_id" "In Progress" 2>/dev/null; then
  echo "✓ Ticket $ticket_id moved to In Progress"
else
  echo "⚠ Could not transition ticket (may already be In Progress)"
fi
echo

# Create and checkout branch
echo "--- CREATING BRANCH ---"
git checkout -b "$branch_name" > /dev/null 2>&1
echo "✓ Branch '$branch_name' created and checked out"
echo

# Success summary
echo "=========================================="
echo "✓ READY TO WORK"
echo "=========================================="
echo
echo "Ticket:  $ticket_id"
echo "Branch:  $branch_name"
echo "Status:  In Progress"
echo
echo "Documentation created at: docs/tickets/${ticket_id}.md"
echo
echo "Happy coding! 🚀"
