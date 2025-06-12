{ self, pkgs, inputs, ... }:

{
  networking.hostName = "juanibiapina"; # this is enforced by Contentful

  # Set primary user for nix-darwin
  system.primaryUser = "juan.ibiapina";

  nix.settings = {
    substituters = [
      "https://nix-community.cachix.org"
    ];
    trusted-public-keys = [
      "nix-community.cachix.org-1:mB9FSh9qf2dCimDSUo8Zy7bkq5CX+/rkCWyvRCYg3Fs="
    ];
  };

  # Configure user account
  users.users."juan.ibiapina".home = "/Users/juan.ibiapina";

  # Enable sudo without password
  security.sudo.extraConfig = ''
    juan.ibiapina ALL=(ALL) NOPASSWD: ALL
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
  nix.settings.trusted-users = [ "root" "juan.ibiapina" ];

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
      "jq"
      "lazygit"
      "lua-language-server" # lua_ls
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
      "docker"
      "dropbox"
      "firefox@developer-edition"
      "font-sauce-code-pro-nerd-font"
      "font-source-code-pro"
      "ghostty"
      "karabiner-elements"
      "keepassxc"
      "spotify"
      "the-unarchiver"
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
  };

  # Set Git commit hash for darwin-version.
  system.configurationRevision = self.rev or self.dirtyRev or null;

  # Used for backwards compatibility, please read the changelog before changing.
  # $ darwin-rebuild changelog
  system.stateVersion = 6;

  # The platform the configuration will be used on.
  nixpkgs.hostPlatform = "aarch64-darwin";
}
