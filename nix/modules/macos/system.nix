{ self, pkgs, lib, config, inputs, ... }:

let cfg = config.modules.system; in
{
  options.modules.system = {
    username = lib.mkOption {
      type = lib.types.str;
      description = "The primary user for this system";
    };
  };

  config = {
    # Allow zsh from nix to be used as the default shell
    environment.shells = [ pkgs.zsh ];

    # Create /etc/zshrc that loads the nix-darwin environment
    programs.zsh.enable = true;

    # Auto upgrade nix package and the daemon service
    nix.package = pkgs.nix;

    nix.settings = {
      # Enable the Nix command and flakes
      experimental-features = "nix-command flakes";

      # Add trusted users to the Nix daemon
      trusted-users = [ "root" cfg.username ];

    };

    # Set primary user for nix-darwin
    system.primaryUser = cfg.username;

    # Configure user account
    users.users.${cfg.username}.home = "/Users/${cfg.username}";

    # Enable sudo without password
    security.sudo.extraConfig = ''
      ${cfg.username} ALL=(ALL) NOPASSWD: ALL
    '';

    # System packages - development tools
    environment.systemPackages = with pkgs;
    let
      nvimPackages = callPackage ../../packages/nvim.nix { inherit inputs; };
    in
    [
      inputs.agenix.packages."${pkgs.stdenv.hostPlatform.system}".default
      inputs.sub.packages."${pkgs.stdenv.hostPlatform.system}".sub

      nvimPackages.nvim
      nvimPackages.nvim-server
      nvimPackages.nvim-plug-install

      bat # cat clone with syntax highlighting and git integration
      fd # simple, fast and user-friendly alternative to find
      fzf # command-line fuzzy finder
      gitmux # tmux plugin to show git status
      hyperfine # command-line benchmarking tool
      nixd # Nix language server
      nodePackages.typescript-language-server
      ripgrep # faster grep alternative
      starship # cross-shell prompt
      supercronic # cron for containers
      terraform-ls # Terraform language server
      tmux # terminal multiplexer
      watchexec # command-line tool to watch a path and execute a command
      zsh # shell
    ];

    # Enable direnv for project specific environment variables
    programs.direnv = {
      enable = true;
      silent = true;
      nix-direnv.enable = true;
      settings = {
        whitelist = {
          exact = ["~/workspace/contentful" "~/workspace/ninetailed-inc"];
        };
      };
    };

    # Homebrew packages and development tools
    homebrew = {
      enable = true;

      onActivation = {
        autoUpdate = true;
        upgrade = true;
        cleanup = "uninstall";
      };

      taps = [
        "charmbracelet/tap"
        "derailed/k9s"
        "dopplerhq/cli"
        "goreleaser/tap"
        "hashicorp/tap"
        "hookdeck/hookdeck"
        "int128/kubelogin"
        "jesseduffield/lazygit"
        "juanibiapina/taps"
        "nikitabobko/tap"
      ];

      brews = [
        # bash
        "bash"
        "bash-language-server"
        "coreutils"

        # git
        "git"
        "git-crypt"
        "git-delta"
        "hub"
        "lazygit"

        # kubernetes
        "k9s"
        "kubelogin" # Used to login with kubectl

        # charm
        "crush" # conding agent
        "glow" # terminal markdown viewer
        "gum" # shell scripting UI toolkit

        # CLI tools
        "doppler" # secrets management
        "hookdeck" # webhooks management
        "jira-cli" # Command-line interface for Jira

        # terraform
        "hashicorp/tap/terraform"

        # go
        "go"
        "gofumpt" # go formatter
        "golangci-lint" # go linter
        "gopls" # go language server

        # javaScript / TypeScript
        "node" # Node.js runtime

        # lua
        "lua-language-server" # language server
        "luarocks" # package manager
        "stylua" # formatter

        # markdown
        "markdown-oxide" # markdown language server

        # python
        "uv" # Python package and project manager

        # ruby
        # ruby-build dependencies
        # https://github.com/rbenv/ruby-build/wiki#suggested-build-environment
        "autoconf"
        "gmp"
        "libyaml"
        "openssl"
        "readline"

        "libpq" # PostgreSQL client libraries, for pg gem

        # tools
        "awscli" # AWS command-line interface
        "gnupg" # gnu privacy guard
        "gob" # background job manager for coding agents
        "htop" # interactive process viewer
        "jq" # command-line JSON processor
        "mise" # version manager
        "ncdu" # disk usage analyzer
        "openssl" # SSL and TLS toolkit
        "parallel" # shell tool for parallel execution
        "stow" # dotfiles manager
        "superfile" # file manager
        "terminal-notifier" # macOS terminal notifier
        "tree" # directory tree viewer
        "watch" # execute a program periodically, showing output
        "wget" # network downloader
      ];

      casks = [
        "aerospace" # window manager
        "betterdisplay" # external monitor management
        "cursor"
        "discord"
        "dropbox"
        "firefox@developer-edition"
        "font-sauce-code-pro-nerd-font"
        "font-source-code-pro"
        "ghostty"
        "goreleaser"
        "karabiner-elements"
        "keepassxc"
        "orbstack" # docker https://docs.orbstack.dev/
        "postman" # API testing
        "raycast"
        "spotify"
        "the-unarchiver"
        "whatsapp"
      ];
    };

    system.defaults = {
      dock = {
        autohide = true;
        expose-group-apps = true; # enable mission control group apps for aerospace
        tilesize = 43;
        mru-spaces = false; # do not reorder spaces based on usage
      };

      spaces = {
        spans-displays = false; # this conflicts with aerospace
      };

      NSGlobalDomain = {
        InitialKeyRepeat = 10;
        KeyRepeat = 1;

        ApplePressAndHoldEnabled = false; # disable holding keys for extra symbols
          NSAutomaticCapitalizationEnabled = false; # disable smart capitalization
          NSAutomaticDashSubstitutionEnabled = false; # disable smart dashes
          NSAutomaticPeriodSubstitutionEnabled = false; # disable smart period
          NSAutomaticQuoteSubstitutionEnabled = false; # disable smart quotes

          "com.apple.trackpad.scaling" = 2.0; # trackpad speed
      };

      WindowManager = {
        EnableStandardClickToShowDesktop = false; # disable click to show desktop
      };
    };

    # Set Git commit hash for darwin-version.
    system.configurationRevision = self.rev or self.dirtyRev or null;

    # Used for backwards compatibility, please read the changelog before changing.
    # $ darwin-rebuild changelog
    system.stateVersion = 6;

    # The platform the configuration will be used on.
    nixpkgs.hostPlatform = "aarch64-darwin";
  };
}
