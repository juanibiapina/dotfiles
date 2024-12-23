{ self, pkgs, inputs, ... }:
{
  networking.hostName = "babbel";

  # Configure user account
  users.users.jibiapina.home = "/Users/jibiapina";

  environment.systemPackages = with pkgs; [
    (callPackage ../../packages/nvim.nix { inherit inputs; })

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
    go
    gopls
    nil # Nix language server
    nodePackages.typescript-language-server
    terraform-ls # Terraform language server
  ];

  # Auto upgrade nix package and the daemon service
  services.nix-daemon.enable = true;
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
      "awscli"
      "bash"
      "coreutils"
      "ctags"
      "gh"
      "git"
      "git-crypt"
      "git-delta"
      "gpg"
      "htop"
      "hub"
      "java"
      "jq"
      "lazygit"
      "libffi"
      "libyaml"
      "ncdu"
      "node"
      "openssl"
      "parallel"
      "readline"
      "stow"
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
