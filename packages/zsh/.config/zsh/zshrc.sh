# Include OS config
os="$(uname)"
[[ -f "$DOTFILES_HOME/os/${os}.sh" ]] && source "$DOTFILES_HOME/os/${os}.sh"

START="$(gdate "+%s%3N")"

# Enable startup profiler https://stackoverflow.com/questions/4351244/can-i-profile-my-zshrc-zshenv/4351664#4351664
PROFILE_STARTUP=false
if [[ "$PROFILE_STARTUP" == true ]]; then
    zmodload zsh/datetime
    setopt promptsubst
    PS4='$EPOCHREALTIME %N:%i> '
    exec 3>&2 2>/tmp/startlog.$$
    setopt xtrace prompt_subst
fi

# set locale
export LC_ALL=en_US.UTF-8
export LANG=en_US.UTF-8
export LC_CTYPE=UTF-8

# set editor
export EDITOR=nvim

# Enable emacs keys
bindkey -e

# Disable flow control
stty -ixon

# Configure PATH
source "$DOTFILES_HOME/path.sh"

# Configure aliases
source "$DOTFILES_HOME/lib/aliases.zsh"

# Include plugins
for file ($DOTFILES_HOME/plugins/*.sh) source $file

# Include secret zsh config
[[ -f "$DOTFILES_HOME/zshrc.secret" ]] && source "$DOTFILES_HOME/zshrc.secret"

# These entries should always come first in PATH, that's why they're added here
export PATH="bin:$PATH"
export PATH="script:$PATH"

# Configure prompt
source "$DOTFILES_HOME/prompt.sh"

# Configure completions
source "$DOTFILES_HOME/lib/completion.zsh"

# Finish startup profiling
if [[ "$PROFILE_STARTUP" == true ]]; then
    unsetopt xtrace
    exec 2>&3 3>&-
fi

LAST_COMMAND_TIME=$(($(gdate "+%s%3N")-$START))

echo "Startup time: ${LAST_COMMAND_TIME}ms"
