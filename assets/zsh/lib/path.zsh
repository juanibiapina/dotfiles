# PATH configuration - idempotent, works for all shell types
#
# This file is sourced from .zshenv and runs after /etc/zshenv has set up
# the base system PATH (including Nix on nix-darwin/NixOS).
#
# Strategy: Use a guard variable to ensure this only runs once per shell session.

if [ -z "$DOTFILES_PATH_CONFIGURED" ]; then
  export DOTFILES_PATH_CONFIGURED=1

  # At this point, PATH already contains:
  # - Nix paths (from /etc/zshenv on nix-darwin/NixOS)
  # - Cargo paths (from .zshenv sourcing cargo env)
  # - System paths (/usr/bin, /bin, etc.)

  # Use zsh's path array for cleaner syntax
  # Prepend custom directories (they'll appear first in PATH)
  path=(
    ~/bin
    ~/resources/node_modules/bin
    ~/Library/pnpm
    ~/workspace/basherpm/basher/bin
    $path  # Preserve all existing paths from system setup
  )

  # Append directories (they'll appear last in PATH)
  path+=(
    ~/go/bin
  )

  # Export PATH for other programs
  export PATH
fi
