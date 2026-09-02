# Enable emacs keys
bindkey -e

# Disable flow control
stty -ixon

# Configure aliases
source "$ZSH_HOME/lib/aliases.zsh"

# Include plugins
for file ($ZSH_HOME/plugins/*.sh) source $file

# Include secret zsh config
[[ -f "$DOTFILES_HOME/secrets/zshrc.secret" ]] && source "$DOTFILES_HOME/secrets/zshrc.secret"

# Configure prompt
source "$ZSH_HOME/lib/prompt.zsh"

# Include dev CLI completions
source "$DOTFILES_HOME/cli/completions/dev.zsh"

# Configure completions
source "$ZSH_HOME/lib/completions.zsh"

# Include plugins that require compinit
for file ($ZSH_HOME/after/*.sh) source $file

# Finish startup profiling (opt-in via ZSH_PROFILE, set up in .zshenv)
if [[ -n "$ZSH_PROFILE" && -o interactive ]]; then
    case "$ZSH_PROFILE" in
        xtrace)
            unsetopt xtrace
            exec 2>&3 3>&-
            >&2 echo "xtrace log: $ZSH_PROFILE_LOG (rank with: dev zsh-profile analyze $ZSH_PROFILE_LOG)"
            ;;
        zprof)
            zprof
            ;;
    esac
    >&2 printf 'Startup time: %.0fms\n' $(( (EPOCHREALTIME - ZSH_PROFILE_START) * 1000 ))
fi
