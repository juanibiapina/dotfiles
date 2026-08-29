#!/usr/bin/env bash

# This script should run after the manual steps from the flash drive

wait_for_input() {
  echo
  echo "Press any key to continue..."
  read -n 1 -s
}

# install brew (https://brew.sh/)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# configure terminal to use brew
eval "$(/opt/homebrew/bin/brew shellenv)"

# install nix
sh <(curl --proto '=https' --tlsv1.2 -L https://nixos.org/nix/install)

# run nix darwin for the first time
(
  cd "$HOME"/workspace/juanibiapina/dotfiles || exit
  sudo nix run --extra-experimental-features nix-command --extra-experimental-features flakes nix-darwin/master#darwin-rebuild -- --flake . switch
)

# terminal restart needed

# install dotfiles
(
  cd "$HOME"/workspace/juanibiapina/dotfiles || exit
  make
)

# set zsh as default shell
chsh -s /run/current-system/sw/bin/zsh

# import secrets (requires syncthing to be synced, but could import from flash drive instead)
dev secrets import-master-key

# init git crypt for dotfiles
echo "Init git crypt for dotfiles."
# git-crypt unlock
wait_for_input

# Grant pi's launcher Full Disk Access, once. This stops every macOS
# file-access prompt for pi, and for pi only.
#
# It works because pi runs through a disclaim launcher
# (nix/modules/pi/pi-launcher.c): macOS TCC attributes pi's file access to the
# launcher binary, not the terminal emulator, and regardless of which terminal
# started the tmux server. One grant is enough: the launcher derivation does not
# depend on pi's version, so it survives pi upgrades.
echo "Grant pi's launcher Full Disk Access (the settings pane will open):"
echo "  1. Click +, press Cmd+Shift+G, paste the path printed below, select 'pi'."
echo "  2. Ensure the pi toggle is on."
echo "  3. Fully restart the terminal."
echo "Launcher path:"
readlink -f "$(command -v pi)"
open "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles"
wait_for_input

# restart
echo "Logout and login again to apply changes."
