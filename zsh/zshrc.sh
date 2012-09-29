export TERM=xterm-256color

# Start tmux
if [ "$ZSH_USE_TMUX" = true ]; then
  if [ -z "$TMUX" ]; then
    if tmux ls 2> /dev/null | grep -v '(attached)$'; then
        tmux attach && exit 0
    else
        tmux -2 && exit 0
    fi
  fi
fi

# Enable emacs keys
bindkey -e

# Disable flow control
stty -ixon

# Include all files in lib dir
for file ($ZSH_HOME/lib/*) source $file

# Include plugins
if [ "$ZSH_PLUGINS" = all ]; then
  for file ($ZSH_HOME/plugins/*) source $file
else
  for plugin ($ZSH_PLUGINS) source $ZSH_HOME/plugins/$plugin.sh
fi

# Set default theme if no theme selected
if [ -z "$ZSH_THEME" ]; then
  ZSH_THEME=default
fi

# Apply theme
source "$ZSH_HOME/themes/$ZSH_THEME.sh"

# Add user bin to path
export PATH=~/bin:$PATH
