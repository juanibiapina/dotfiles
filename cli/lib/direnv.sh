# Load the direnv environment for the current working directory.
#
# tmux run-shell executes scripts in a non-interactive shell with no direnv
# hook, so .envrc files never load automatically. Call this after landing in
# the target repo dir so per-repo env (work GITHUB_TOKEN, GIT_SSH_COMMAND, git
# author email, etc.) is applied.
#
# Silent and non-fatal: if the dir is not direnv-allowed, nothing is exported
# and the caller keeps its default environment.
#
load_direnv() {
  eval "$(direnv export bash 2>/dev/null)" || true
}
