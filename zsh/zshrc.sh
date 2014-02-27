export TERM=xterm-256color

# Include host config
hostname="$(hostname -s)"
[[ -f "$ZSH_HOME/hosts/$hostname.sh" ]] && source "$ZSH_HOME/hosts/$hostname.sh"

# set editor
export EDITOR=vi

# Enable emacs keys
bindkey -e

# Disable flow control
stty -ixon

# Bash profile integration
if [ "$ZSH_PROFILE_INTEGRATION" = true ]; then
  for file (/etc/profile.d/*) source $file
fi

# Include all files in lib dir
for file ($ZSH_HOME/lib/*) source $file

# Include plugins
for file ($ZSH_HOME/plugins/*.sh) source $file

# Configure PATH
source "$ZSH_HOME/path.sh"

# Set default theme if no theme selected
if [ -z "$ZSH_THEME" ]; then
  ZSH_THEME=default
fi

# Apply theme
source "$ZSH_HOME/themes/$ZSH_THEME.sh"
