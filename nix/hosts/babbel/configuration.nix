{ self, pkgs, inputs, ... }:
{
  networking.hostName = "babbel";

  nix.settings = {
    substituters = [
      "https://devenv.cachix.org"
      "https://nix-community.cachix.org"
    ];
    trusted-public-keys = [
      "devenv.cachix.org-1:w1cLUi8dv3hnoSPGAuibQv+f9TZLr6cv/Hm9XgU50cw="
      "nix-community.cachix.org-1:mB9FSh9qf2dCimDSUo8Zy7bkq5CX+/rkCWyvRCYg3Fs="
    ];
  };

  # Configure user account
  users.users.jibiapina.home = "/Users/jibiapina";

  environment.systemPackages = with pkgs;
  let
    nvimPackages = callPackage ../../packages/nvim.nix { inherit inputs; };
  in
  [
    nvimPackages.nvim
    nvimPackages.nvim-server

    inputs.sub.packages."${pkgs.system}".sub
    inputs.antr.packages."${pkgs.system}".antr

    bat
    fd
    fzf
    gitmux
    hyperfine
    ripgrep
    starship
    tmux
    vim
    watchexec
    zsh

    # coding
    nil # Nix language server
    nodePackages.typescript-language-server
    terraform-ls # Terraform language server
  ];

  # Auto upgrade nix package and the daemon service
  nix.package = pkgs.nix;

  # Enable the Nix command and flakes
  nix.settings.experimental-features = "nix-command flakes";

  # Add trusted users to the Nix daemon
  nix.settings.trusted-users = [ "root" "jibiapina" ];

  # Create /etc/zshrc that loads the nix-darwin environment
  programs.zsh.enable = true;

  # Enable direnv
  programs.direnv = {
    enable = true;
    silent = true;
    nix-direnv.enable = true;
  };

  homebrew = {
    enable = true;

    taps = [
      "homebrew/cask-fonts"
      "homebrew/cask-versions"
      "homebrew/services"
      "jesseduffield/lazygit"
    ];

    brews = [
      "aider"
      "awscli"
      "bash"
      "coreutils"
      "ctags"
      "gh"
      "git"
      "git-crypt"
      "git-delta"
      "glow" # terminal markdown viewer
      "go"
      "gofumpt" # go formatter
      "golangci-lint" # go linter
      "gopls" # go language server
      "gpg"
      "htop"
      "hub"
      "java"
      "jq"
      "lazygit"
      "libffi"
      "libyaml"
      "mods" # AI on the CLI with pipes
      "ncdu"
      "node"
      "openssl"
      "parallel"
      "readline"
      "stow"
      "superfile"
      "terminal-notifier"
      "tree"
      "wakeonlan"
      "watch"
      "wget"
      "zsh"
    ];

    casks = [
      "alacritty"
      "barrier"
      "discord"
      "docker"
      "dropbox"
      "firefox-developer-edition"
      "font-sauce-code-pro-nerd-font"
      "font-source-code-pro"
      "godot"
      "iterm2"
      "karabiner-elements"
      "keepassxc"
      "macvim"
      "musescore"
      "obsidian"
      "protonvpn"
      "rectangle"
      "simplenote"
      "skype"
      "slack"
      "spotify"
      "the-unarchiver"
      "vlc"
    ];
  };

  # Set Git commit hash for darwin-version.
  system.configurationRevision = self.rev or self.dirtyRev or null;

  # Used for backwards compatibility, please read the changelog before changing.
  # $ darwin-rebuild changelog
  system.stateVersion = 4;

  # The platform the configuration will be used on.
  nixpkgs.hostPlatform = "aarch64-darwin";
}
