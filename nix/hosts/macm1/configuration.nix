{ self, pkgs, inputs, ... }:
{
  imports = [
    ../../modules/osxdefaults.nix
  ];

  networking.hostName = "macm1";

  # Set primary user for nix-darwin
  system.primaryUser = "juan";

  nix.settings = {
    substituters = [
      "https://nix-community.cachix.org"
    ];
    trusted-public-keys = [
      "nix-community.cachix.org-1:mB9FSh9qf2dCimDSUo8Zy7bkq5CX+/rkCWyvRCYg3Fs="
    ];
  };

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
    nodePackages.typescript-language-server
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

  # Enable direnv
  programs.direnv = {
    enable = true;
    silent = true;
    nix-direnv.enable = true;
  };

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
      "libpq" # PostgreSQL client libraries
      "libyaml"
      "lua-language-server" # lua_ls
      "mise" # tool version manager (currently used for ruby)
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
    ];

    casks = [
      "aerospace" # window manager for macOS
      "alacritty"
      "barrier"
      "discord"
      "docker"
      "dropbox"
      "firefox@developer-edition"
      "font-sauce-code-pro-nerd-font"
      "font-source-code-pro"
      "ghostty"
      "iterm2"
      "karabiner-elements"
      "keepassxc"
      "macvim"
      "musescore"
      "raycast"
      "rectangle"
      "skype"
      "slack"
      "spotify"
      "the-unarchiver"
      "vlc"
    ];
  };

  system.defaults = {
    dock = {
      autohide = true;
      tilesize = 43;
      mru-spaces = false; # do not reorder spaces based on usage
      expose-group-apps = true; # workaround for using mission control with aerospace
    };

    NSGlobalDomain = {
      InitialKeyRepeat = 10;
      KeyRepeat = 1;

      NSAutomaticCapitalizationEnabled = false; # disable smart capitalization
      NSAutomaticDashSubstitutionEnabled = false; # disable smart dashes
      NSAutomaticPeriodSubstitutionEnabled = false; # disable smart period
      NSAutomaticQuoteSubstitutionEnabled = false; # disable smart quotes

      "com.apple.trackpad.scaling" = 2.0; # trackpad speed
    };

    # Disable popups when launching apps for the first time
    LaunchServices.LSQuarantine = false;
  };

  # Set Git commit hash for darwin-version.
  system.configurationRevision = self.rev or self.dirtyRev or null;

  # Used for backwards compatibility, please read the changelog before changing.
  # $ darwin-rebuild changelog
  system.stateVersion = 6;

  # The platform the configuration will be used on.
  nixpkgs.hostPlatform = "aarch64-darwin";
}
