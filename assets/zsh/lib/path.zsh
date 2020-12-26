if [ -z "$ORIGINAL_PATH" ]; then
  export ORIGINAL_PATH="$PATH"
fi

# Base path (from the OS)
#export PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin
export PATH="$ORIGINAL_PATH"

# User bin
export PATH=~/bin:$PATH

# Npm
export PATH="$HOME/resources/node_modules/bin:$PATH"

# Rustup
export PATH=$HOME/.cargo/bin:$PATH

# Babbel Development CLI
export PATH="$HOME/workspace/lessonnine/development.cli/bin:$PATH"

# Flatpak
export PATH="/var/lib/flatpak/exports/bin:$PATH"
