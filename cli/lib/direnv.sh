# Load the direnv environment for the current working directory.
#
# tmux run-shell executes scripts in a non-interactive shell with no direnv
# hook, so .envrc files never load automatically. Call this after landing in
# the target repo dir so its project environment is applied.
#
# Silent and non-fatal: if the dir is not direnv-allowed, nothing is exported
# and the caller keeps its default environment.
#
load_direnv() {
  eval "$(direnv export bash 2>/dev/null)" || true
}
