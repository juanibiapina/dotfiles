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

# restart
echo "Logout and login again to apply changes."
