{ self, pkgs, lib, config, inputs, ... }:

let cfg = config.modules.system; in
{
  imports = [
    ./discord.nix
    ./keyboard-shortcuts.nix
    ./spotlight.nix
    ../gogcli.nix
    ../browse-cli.nix
    ../websearch.nix
    ../pi.nix
    ../deltoids.nix
    ../tmux.nix
  ];

  options.modules.system = {
    username = lib.mkOption {
      type = lib.types.str;
      description = "The primary user for this system";
    };
  };

  config = {
    # Keep remote sessions available while connected to AC power, and turn the
    # display off after 10 minutes (macOS defaults: 2 on battery, 10 on AC).
    system.activationScripts.power.text = lib.mkAfter ''
      /usr/bin/pmset -c sleep 0
      /usr/bin/pmset -a displaysleep 10
    '';

    # Name shown in Finder, AirDrop, and Sharing; match the hostname.
    networking.computerName = config.networking.hostName;

    # After each switch:
    # - Make Firefox Developer Edition the default browser. A no-op when it
    #   already is; otherwise macOS asks once for confirmation.
    # - Add these apps to System Settings > Login Items > Open at Login. Apps
    #   that are already listed are left alone. The first run asks once for
    #   permission to control System Events.
    # - Spotify: turn off its own start-at-login, which opens it minimized and
    #   hides the window the login item opens, and hide release announcements
    #   (ui.hide_hpto, per account, so it applies after the first Spotify
    #   login). Spotify rewrites its prefs on quit, so they are only edited
    #   while Spotify is not running.
    system.activationScripts.postActivation.text = lib.mkAfter (''
      launchctl asuser "$(id -u ${cfg.username})" sudo -u ${cfg.username} \
        ${pkgs.defaultbrowser}/bin/defaultbrowser firefoxdeveloperedition || true
    '' + lib.concatMapStrings (app: ''
      launchctl asuser "$(id -u ${cfg.username})" sudo -u ${cfg.username} /usr/bin/osascript \
        -e 'tell application "System Events" to if not (exists login item "${app}") then make login item at end with properties {path:"/Applications/${app}.app", hidden:false}' \
        >/dev/null || true
    '') [
      "AeroSpace"
      "BetterDisplay"
      "Discord"
      "Firefox Developer Edition"
      "Ghostty"
      "Google Chrome"
      "KeePassXC"
      "Raycast"
      "Slack"
      "Spotify"
      "Tailscale"
      "WhatsApp"
      "Wispr Flow"
    ] + ''
      if ! /usr/bin/pgrep -qx Spotify; then
        sudo -u ${cfg.username} /bin/sh -c '
          set_prefs() {
            file=$1; shift
            missing=0
            for line in "$@"; do grep -qxF "$line" "$file" 2>/dev/null || missing=1; done
            [ $missing = 1 ] || return 0
            mkdir -p "$(dirname "$file")" && touch "$file" || return 0
            : > "$file.tmp"
            while IFS= read -r existing || [ -n "$existing" ]; do
              keep=1
              for line in "$@"; do [ "''${existing%%=*}" = "''${line%%=*}" ] && keep=0; done
              [ $keep = 0 ] || printf "%s\n" "$existing" >> "$file.tmp"
            done < "$file"
            printf "%s\n" "$@" >> "$file.tmp"
            mv "$file.tmp" "$file"
          }
          dir="$1/Library/Application Support/Spotify"
          set_prefs "$dir/prefs" "app.autostart-mode=\"off\"" "app.autostart-configured=true"
          for user_prefs in "$dir"/Users/*/prefs; do
            [ -f "$user_prefs" ] && set_prefs "$user_prefs" "ui.hide_hpto=true"
          done
        ' sh "${config.users.users.${cfg.username}.home}" || true
      fi
    '');

    # No chime when the Mac starts.
    system.startup.chime = false;

    # Allow zsh from nix to be used as the default shell
    environment.shells = [ pkgs.zsh ];

    # Create /etc/zshrc that loads the nix-darwin environment
    programs.zsh.enable = true;
    # Skip nix-darwin's global compinit; completions.zsh runs a cached compinit
    # itself, and running compinit twice re-does the ~140ms security audit.
    programs.zsh.enableGlobalCompInit = false;
    # starship replaces the prompt, so skip nix-darwin's throwaway `prompt suse`.
    programs.zsh.promptInit = "";

    nixpkgs.config.allowUnfreePredicate = pkg: builtins.elem (lib.getName pkg) [ "gitbutler-nightly" "but-mesh" ];

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
    users.users.${cfg.username} = {
      home = "/Users/${cfg.username}";
      openssh.authorizedKeys.keys = (import ../ssh-keys.nix).userList;
    };

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

      fd # simple, fast and user-friendly alternative to find
      fzf # command-line fuzzy finder
      hyperfine # command-line benchmarking tool
      # Element-based UI driver for the USB-attached Pixel (maestro
      # test/hierarchy/studio). Bundles its own JRE; adb/fastboot come from the
      # android-platform-tools cask below. Mirrors the mini host. See
      # apps/agent-mobile/README.md in juanibiapina/zero and docs/android.md.
      maestro
      nixd # Nix language server
      typescript-language-server
      ripgrep # faster grep alternative
      starship # cross-shell prompt
      watchexec # command-line tool to watch a path and execute a command
      zsh # shell
    ];

    # Enable direnv for project specific environment variables
    programs.direnv = {
      enable = true;
      silent = true;
      nix-direnv.enable = true;
    };

    # Homebrew packages and development tools
    homebrew = {
      enable = true;

      onActivation = {
        autoUpdate = true;
        upgrade = true;
        cleanup = "uninstall";
        extraFlags = ["--upgrade" "--force"];
      };

      taps = [
        "charmbracelet/tap"
        "goreleaser/tap"
        "juanibiapina/taps"
        "nikitabobko/tap"
        "oven-sh/bun"
        "oiwn/tap"
        "sachaos/todoist"
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
        "lazygit"

        # charm
        "charmbracelet/tap/glow" # terminal markdown viewer
        "charmbracelet/tap/gum" # shell scripting UI toolkit

        # go
        "go"
        "gofumpt" # go formatter
        "golangci-lint" # go linter
        "gopls" # go language server

        # javaScript / TypeScript
        "node" # Node.js runtime
        "oven-sh/bun/bun" # JavaScript runtime and toolkit

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

        # zig
        "zig"

        "libpq" # PostgreSQL client libraries, for pg gem

        # tools
        "sachaos/todoist/todoist"
        "cloudflared" # Cloudflare Tunnel client
        "codeburn" # AI coding token usage and cost tracker
        "ffmpeg" # media processing (needed by yt-dlp)
        "gitwatch" # auto-commit git changes
        "gnupg" # gnu privacy guard
        "juanibiapina/taps/gob" # background job manager for coding agents
        "juanibiapina/taps/starmux" # tmux sidebar
        "juanibiapina/taps/todo" # per-directory todo list
        "htop" # interactive process viewer
        "jq" # command-line JSON processor
        "mise" # version manager
        "ncdu" # disk usage analyzer
        "parallel" # shell tool for parallel execution
        "pkgconf" # package compiler and linker metadata toolkit
        "poppler" # PDF utilities including pdftotext
        "stow" # dotfiles manager
        "oiwn/tap/tarts" # terminal arts and animations
        "yt-dlp" # video/audio downloader
        "terminal-notifier" # macOS terminal notifier
        "tree" # directory tree viewer
        "watch" # execute a program periodically, showing output
        "wget" # network downloader
      ];

      casks = [
        "android-platform-tools" # adb, fastboot for Android development
        "nikitabobko/tap/aerospace" # window manager
        "betterdisplay" # external monitor management
        "blender" # 3D creation suite
        "claude" # Anthropic desktop app
        "discord"
        "firefox@developer-edition"
        "font-sauce-code-pro-nerd-font"
        "font-source-code-pro"
        "ghostty"
        "google-chrome"
        "goreleaser/tap/goreleaser"
        { name = "karabiner-elements"; greedy = true; } # greedy so `make` upgrades the self-updating cask
        "keepassxc"
        "keycastr" # keypress visualizer
        "orbstack" # docker https://docs.orbstack.dev/
        "paseo"
        "raycast"
        "slack"
        "spotify"
        { name = "tailscale-app"; greedy = true; } # mesh VPN; greedy so `make` upgrades the self-updating cask
        "the-unarchiver"
        "tigervnc"
        "tuple" # remote pair programming
        "whatsapp"
        "wispr-flow" # voice dictation
        "zoom"
      ];
    };

    system.defaults = {
      dock = {
        autohide = true;
        expose-group-apps = true; # enable mission control group apps for aerospace
        tilesize = 43;
        mru-spaces = false; # do not reorder spaces based on usage

        # disable hot corners (macOS defaults bottom-right to Quick Note)
        wvous-tl-corner = 1;
        wvous-tr-corner = 1;
        wvous-bl-corner = 1;
        wvous-br-corner = 1;
      };

      spaces = {
        spans-displays = true; # this conflicts with aerospace
      };

      NSGlobalDomain = {
        InitialKeyRepeat = 10;
        KeyRepeat = 1;
        "com.apple.keyboard.fnState" = true;

        ApplePressAndHoldEnabled = false; # disable holding keys for extra symbols
          NSAutomaticCapitalizationEnabled = false; # disable smart capitalization
          NSAutomaticDashSubstitutionEnabled = false; # disable smart dashes
          NSAutomaticPeriodSubstitutionEnabled = false; # disable smart period
          NSAutomaticQuoteSubstitutionEnabled = false; # disable smart quotes

          "com.apple.trackpad.scaling" = 2.0; # trackpad speed
      };

      CustomUserPreferences = {
        "NSGlobalDomain" = {
          # Disable mouse acceleration (linear response)
          "com.apple.mouse.linear" = 1;
          # Mouse tracking speed
          "com.apple.mouse.scaling" = 0.6875;
        };

        # Raycast configuration
        # NOTE: These settings are applied via defaults write, but have limitations:
        # - onboardingCompleted may not fully skip onboarding on fresh installs
        #   (Raycast may still show it if encrypted SQLite databases don't exist)
        # - Extensions and their settings are stored in encrypted databases,
        #   not manageable via defaults
        # - For full config backup, use Raycast's export/import in Advanced preferences
        # Tailscale (Standalone variant): let brew/make own updates. Disable the
        # in-app Sparkle updater so it stops checking and popping a window at login.
        "io.tailscale.ipn.macsys" = {
          SUEnableAutomaticChecks = false; # no update checks or "new version" prompts
          SUAutomaticallyUpdate = false;   # never self-install; brew owns updates
        };

        "com.raycast.macos" = {
          raycastGlobalHotkey = "Command-49"; # Cmd+Space (49 = spacebar keycode)
          onboardingCompleted = true;
          raycastPreferredWindowMode = "default";
          raycastShouldFollowSystemAppearance = true;
          showGettingStartedLink = false;
        };
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
