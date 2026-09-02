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

# Defer the completion system until the line editor is idle. It is not needed
# to reach the prompt or to run a command, only to <TAB>-complete, so moving it
# off the pre-prompt path makes the shell interactive sooner. Windows that run a
# TUI or `exec` a program before idling (the tmux launcher windows) skip it
# entirely. Everything the first command needs (PATH, env, aliases, prompt,
# direnv/mise hooks) stays eager above.
source "$ZSH_HOME/zsh-defer.plugin.zsh"

# compinit and everything that depends on it (zstyles, the TAB binding, and the
# after/* plugins that call compdef). zsh-defer preserves order, so compinit
# runs before the compdef callers.
zsh-defer source "$ZSH_HOME/lib/completions.zsh"
for file ($ZSH_HOME/after/*.sh) zsh-defer source $file

# Finish startup profiling (opt-in via ZSH_PROFILE, set up in .zshenv)
if [[ -n "$ZSH_PROFILE" && -o interactive ]]; then
    case "$ZSH_PROFILE" in
        xtrace)
            unsetopt xtrace
            exec 2>&3 3>&-
            >&2 echo "xtrace log: $ZSH_PROFILE_LOG (rank with: dev zsh-profile analyze $ZSH_PROFILE_LOG)"
            >&2 printf 'Startup time: %.0fms\n' $(( (EPOCHREALTIME - ZSH_PROFILE_START) * 1000 ))
            ;;
        zprof)
            zprof
            >&2 printf 'Startup time: %.0fms\n' $(( (EPOCHREALTIME - ZSH_PROFILE_START) * 1000 ))
            ;;
        firstprompt)
            # Measure time until the first prompt: deferred work is scheduled but
            # has not run yet (it runs on zle idle, after precmd). This is the
            # metric async deferral actually improves; `zsh -ic exit` does not.
            _zsh_firstprompt() {
                >&2 printf 'first-prompt: %.0fms\n' $(( (EPOCHREALTIME - ZSH_PROFILE_START) * 1000 ))
                exit
            }
            autoload -Uz add-zsh-hook
            add-zsh-hook precmd _zsh_firstprompt
            ;;
    esac
fi
