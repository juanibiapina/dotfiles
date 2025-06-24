{ self, pkgs, inputs, ... }:
{
  imports = [
    ../../modules/macos-defaults.nix
    ../../modules/direnv.nix
    ../../modules/openssh.nix
    ../../modules/substituters.nix
    ../../modules/ruby.nix
    ../../modules/nodejs.nix
    ../../modules/docker.nix
  ];

  networking.hostName = "macm1";

  # Set primary user for nix-darwin
  system.primaryUser = "juan";

  # Configure user account
  users.users.juan.home = "/Users/juan";

  # Enable sudo without password
  security.sudo.extraConfig = ''
    juan ALL=(ALL) NOPASSWD: ALL
  '';

  # Allow zsh from nix to be used as the default shell
  environment.shells = [ pkgs.zsh ];

  environment.systemPackages = with pkgs;
  let
    nvimPackages = callPackage ../../packages/nvim.nix { inherit inputs; };
  in
  [
    inputs.agenix.packages."${pkgs.system}".default

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
    nixd # Nix language server
    terraform-ls # Terraform language server
  ];

  # Auto upgrade nix package and the daemon service
  nix.package = pkgs.nix;

  # Enable the Nix command and flakes
  nix.settings.experimental-features = "nix-command flakes";

  # Add trusted users to the Nix daemon
  nix.settings.trusted-users = [ "root" "juan" ];

  # Create /etc/zshrc that loads the nix-darwin environment
  programs.zsh.enable = true;

  homebrew = {
    enable = true;

    taps = [
      "jesseduffield/lazygit"
      "nikitabobko/tap" # aerospace
    ];

    brews = [
      "bash"
      "coreutils"
      "ctags"
      "flyctl" # Fly.io CLI
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
      "lua-language-server" # lua_ls
      "mods" # AI on the CLI with pipes
      "ncdu"
      "openssl"
      "parallel"
      "stow"
      "superfile"
      "terminal-notifier"
      "tree"
      "wakeonlan"
      "watch"
      "wget"
    ];

    casks = [
      "aerospace" # window manager for macOS
      "alacritty"
      "cursor"
      "discord"
      "dropbox"
      "firefox@developer-edition"
      "font-sauce-code-pro-nerd-font"
      "font-source-code-pro"
      "ghostty"
      "karabiner-elements"
      "keepassxc"
      "musescore"
      "raycast"
      "skype"
      "slack"
      "spotify"
      "the-unarchiver"
      "whatsapp"
    ];
  };

  # Set Git commit hash for darwin-version.
  system.configurationRevision = self.rev or self.dirtyRev or null;

  # Used for backwards compatibility, please read the changelog before changing.
  # $ darwin-rebuild changelog
  system.stateVersion = 6;

  # The platform the configuration will be used on.
  nixpkgs.hostPlatform = "aarch64-darwin";
}
