# set locale
export LC_ALL=en_US.UTF-8
export LANG=en_US.UTF-8
export LC_CTYPE=UTF-8

# set editor
# nvim-server starts a neovim server listening on a predictable address when
# running inside a tmux pane
export EDITOR=nvim-server

# set workspace path (used by `dev` commands)
export WORKSPACE="$HOME/workspace"

# Configure PATH
source "$ZSH_HOME/lib/path.zsh"

