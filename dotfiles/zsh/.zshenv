# vim: ft=zsh
#
# .zshenv - Environment variables and PATH
# This file is sourced for ALL shell invocations (login, non-login, interactive, non-interactive)

# set locale
export LC_ALL=en_US.UTF-8
export LANG=en_US.UTF-8
export LC_CTYPE=UTF-8

# set editor
export EDITOR=nvim

# set coding agent
export CODING_AGENT='pi'
export PI_OFFLINE=1

# set notes location
export NOTES_VAULT="$HOME/Sync/notes"

# set workspace path (used by `dev` commands)
export WORKSPACE="$HOME/workspace"

# Set up dotfiles paths first
export DOTFILES_HOME="$HOME/workspace/juanibiapina/dotfiles"
export ZSH_HOME="$DOTFILES_HOME/assets/zsh"

# Source OS-specific configuration
os="$(uname)"
[[ -f "$ZSH_HOME/os/${os}.sh" ]] && source "$ZSH_HOME/os/${os}.sh"

# Configure PATH (idempotent - safe to run multiple times)
source "$ZSH_HOME/lib/path.zsh"

# Source cargo environment if available (adds cargo to PATH)
[[ -f "$HOME/.cargo/env" ]] && source "$HOME/.cargo/env"
