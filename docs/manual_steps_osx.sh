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

# init git crypt for dotfiles
echo "Init git crypt for dotfiles."
wait_for_input

# Configure number of workspaces
# Disable rearranging spaces in mission control
# Configure keyboard shortcuts for displays
# Set timezone
# Configure display positions
# Increase trackpad speed

# Open karabiner-elements for the first time and enable background services
echo "Open Karabiner-Elements for the first time and enable background services."
wait_for_input

# Logout and login again
echo "Logout and login again to apply changes."
