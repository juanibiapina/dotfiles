START="$(gdate "+%s%3N")"

# Enable startup profiler https://stackoverflow.com/questions/4351244/can-i-profile-my-zshrc-zshenv/4351664#4351664
PROFILE_STARTUP=false
if [[ "$PROFILE_STARTUP" == true ]]; then
    zmodload zsh/datetime
    setopt promptsubst
    PS4='+$EPOCHREALTIME %N:%i> '
    exec 3>&2 2>startlog.$$
    setopt xtrace prompt_subst
fi

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

# Finish startup profiling
if [[ "$PROFILE_STARTUP" == true ]]; then
    unsetopt xtrace
    exec 2>&3 3>&-
fi

STARTUP_TIME=$(($(gdate "+%s%3N")-$START))

>&2 echo "Startup time: ${STARTUP_TIME}ms"
