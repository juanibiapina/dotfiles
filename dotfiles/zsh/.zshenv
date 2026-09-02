# vim: ft=zsh
#
# .zshenv - Environment variables and PATH
# This file is sourced for ALL shell invocations (login, non-login, interactive, non-interactive)

# Startup profiling (opt-in). Covers the whole startup path (.zshenv -> path.zsh
# -> zshrc.sh -> after/*). The matching report is emitted at the end of
# assets/zsh/zshrc.sh. Interactive shells only, so non-interactive `zsh -c`
# (e.g. tmux pane commands) keeps a clean stderr.
#
#   ZSH_PROFILE=zprof  zsh -ic exit   # function/hook profile (zsh/zprof)
#   ZSH_PROFILE=xtrace zsh -ic exit   # line-by-line log, ranked by dev zsh-profile
#
# xtrace log path defaults to /tmp/zsh-startup.$$.log; override with ZSH_PROFILE_LOG.
if [[ -n "$ZSH_PROFILE" && -o interactive ]]; then
  zmodload zsh/datetime
  ZSH_PROFILE_START=$EPOCHREALTIME
  case "$ZSH_PROFILE" in
    zprof) zmodload zsh/zprof ;;
    xtrace)
      : "${ZSH_PROFILE_LOG:=/tmp/zsh-startup.$$.log}"
      setopt prompt_subst
      PS4='+$EPOCHREALTIME %N:%i> '
      exec 3>&2 2>"$ZSH_PROFILE_LOG"
      setopt xtrace
      ;;
  esac
fi

# set locale
export LC_ALL=en_US.UTF-8
export LANG=en_US.UTF-8
export LC_CTYPE=UTF-8

# set editor
export EDITOR=nvim

# set coding agent
export CODING_AGENT='pi'
export PI_OFFLINE=1
export PI_FFF_MODE=tools-only

# set notes location
export NOTES_VAULT="$HOME/Sync/notes"

# set todo file location
export TODO_FILE="$NOTES_VAULT/TODO.md"

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
