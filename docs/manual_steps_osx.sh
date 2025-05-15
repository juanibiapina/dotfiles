#!/usr/bin/env bash

# change hostname (System Settings > General > About)
manual # TODO add a prompt telling me to go change it

# install command line tools
xcode-select --install

# install brew (https://brew.sh/)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# configure terminal to use brew
# TODO make this automatic

# install dotfiles
mkdir -p "$HOME"/workspace/juanibiapina
(
  cd "$HOME"/workspace/juanibiapina || exit
  git clone https://github.com/juanibiapina/dotfiles.git
  cd dotfiles || exit
  # TODO: init git crypt. Needs secret keys.
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

# Configure number of workspaces
# Disable rearranging spaces in mission control
# Configure keyboard shortcuts for displays
# Set timezone
# Configure display positions
# Increase trackpad speed

# Logout and login again
