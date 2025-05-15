# change hostname (System Settings > General > About)

# install command line tools
xcode-select --install

# install brew (https://brew.sh/)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# install nix
sh <(curl --proto '=https' --tlsv1.2 -L https://nixos.org/nix/install)

# install dotfiles
mkdir -p "$HOME"/workspace/juanibiapina
(
  cd "$HOME"/workspace/juanibiapina || exit
  git clone https://github.com/juanibiapina/dotfiles.git
)

# run nix darwin for the first time
(
  cd "$HOME"/workspace/juanibiapina/dotfiles || exit
  nix run nix-darwin/master#darwin-rebuild -- --flake . switch
)

# Disable automatic capitalization as it’s annoying when typing code
defaults write NSGlobalDomain NSAutomaticCapitalizationEnabled -bool false

# Disable smart dashes as they’re annoying when typing code
defaults write NSGlobalDomain NSAutomaticDashSubstitutionEnabled -bool false

# Disable automatic period substitution as it’s annoying when typing code
defaults write NSGlobalDomain NSAutomaticPeriodSubstitutionEnabled -bool false

# Disable smart quotes as they’re annoying when typing code
defaults write NSGlobalDomain NSAutomaticQuoteSubstitutionEnabled -bool false

# Adjust keyboard repeat
defaults write -g InitialKeyRepeat -int 10
defaults write -g KeyRepeat -float 1.2

# Autohide Dock
defaults write com.apple.dock autohide -int 1

# Reduce Dock size
defaults write com.apple.dock tilesize -int 43

# Allow brew zsh to be a shell
which zsh | sudo tee -a /etc/shells

# Change default shell to zsh
chsh -s `which zsh`

# Configure number of workspaces
# Disable rearranging spaces in mission control
# Configure keyboard shortcuts for displays
# Set timezone
# Configure display positions
# Increase trackpad speed

# Install juanibiapina/dev

# install nix-direnv and flakes with nix-env

# Logout and login again
