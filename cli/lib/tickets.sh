# Resolve the current project from $PWD or --project flag.
# Sets TICKETS_PROJECT (owner/repo) and TICKETS_FILE (path to markdown file).
#
# Usage: resolve_project [explicit_project]
#
resolve_project() {
  local project="$1"

  if [ -z "$project" ]; then
    # Auto-detect from $PWD under $WORKSPACE
    if [ -z "$WORKSPACE" ]; then
      error "WORKSPACE is not set"
      exit 1
    fi

    local rel="${PWD#$WORKSPACE/}"
    if [ "$rel" = "$PWD" ]; then
      error "Not inside \$WORKSPACE and no --project specified"
      exit 1
    fi

    # Extract owner/repo (first two path components)
    local owner repo
    owner="$(echo "$rel" | cut -d/ -f1)"
    repo="$(echo "$rel" | cut -d/ -f2)"

    if [ -z "$owner" ] || [ -z "$repo" ]; then
      error "Could not determine owner/repo from path"
      exit 1
    fi

    project="$owner/$repo"
  fi

  if [ -z "$NOTES_VAULT" ]; then
    error "NOTES_VAULT is not set"
    exit 1
  fi

  TICKETS_PROJECT="$project"
  TICKETS_FILE="$NOTES_VAULT/tickets/$project.md"
}
