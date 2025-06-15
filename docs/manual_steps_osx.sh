#!/usr/bin/env bash

wait_for_input() {
  echo
  echo "Press any key to continue..."
  read -n 1 -s
}

# change hostname (System Settings > General > About)
echo "Go to System Settings > General > About and change the hostname to the desired one."
wait_for_input

# install command line tools
xcode-select --install

# install brew (https://brew.sh/)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# configure terminal to use brew
eval "$(/opt/homebrew/bin/brew shellenv)"

# install dotfiles
mkdir -p "$HOME"/workspace/juanibiapina
(
  cd "$HOME"/workspace/juanibiapina || exit
  git clone https://github.com/juanibiapina/dotfiles.git
  cd dotfiles || exit
  make
)

# install nix
sh <(curl --proto '=https' --tlsv1.2 -L https://nixos.org/nix/install)

# run nix darwin for the first time
(
  cd "$HOME"/workspace/juanibiapina/dotfiles || exit
  nix run nix-darwin/master#darwin-rebuild -- --flake . switch
)

# set zsh as default shell
chsh -s /run/current-system/sw/bin/zsh

# Install pcloud (not available on nix or brew)
echo "Install pcloud"
wait_for_input

# import secrets

# init git crypt for dotfiles
echo "Init git crypt for dotfiles."
wait_for_input

# Open karabiner-elements for the first time and enable background services
echo "Open Karabiner-Elements for the first time and enable background services."
wait_for_input

# Setup dropbox

# Logout and login again
echo "Logout and login again to apply changes."

# configs missing:
- create 10 workspaces
- shortcuts for workspaces
