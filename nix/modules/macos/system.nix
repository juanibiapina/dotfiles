{ self, pkgs, lib, config, inputs, ... }:

let
  cfg = config.modules.system;

  # Tinycast stores each hotkey as a JSON-encoded HotKeyBinding.
  # Cmd+Space: keycode 49 is space, modifier 256 is Carbon's cmdKey.
  # Ctrl+Option+Cmd+H, sent by the Moonlander's headphones key: keycode 4 is h,
  # modifier 6400 is controlKey 4096 + optionKey 2048 + cmdKey 256.
  hotKeyBinding = keyCode: modifiers:
    ''{"combo":{"_0":{"carbonKeyCode":${toString keyCode},"carbonModifiers":${toString modifiers}}}}'';

  # Tinycast custom commands. hotkey is optional.
  tinycastCommands = [
    {
      id = "7b3f2c1e-5a4d-4e8b-9c6f-0d2a1b3c4e5f";
      name = "Connect Headphones";
      command = "dev headphones";
      iconSymbol = "headphones";
      hotkey = hotKeyBinding 4 6400;
    }
    {
      id = "e83a937a-abf6-4391-80a1-12865897c4b2";
      name = "Flash Moonlander";
      command = "open -na Ghostty --args --title='Flash Moonlander' --wait-after-command=true --quit-after-last-window-closed=true -e /bin/zsh -lc 'dev keyboard flash'";
      iconSymbol = "keyboard";
    }
  ];
  tinycastBoundCommands = lib.filter (c: c ? hotkey) tinycastCommands;

  tinycastPreferences = {
    "hotkey.togglePalette" = hotKeyBinding 49 256;
    boundCustomCommandIDs = map (c: c.id) tinycastBoundCommands;
    customCommandsEnabled = true;
    customCommandsShowInLauncher = true;
    compactMode = false; # open the full panel, no capsule bar that resizes
  } // lib.listToAttrs (map (c: lib.nameValuePair "hotkey.customCommand.${c.id}" c.hotkey) tinycastBoundCommands);

  tinycastCustomCommands = builtins.toJSON (map (c:
    removeAttrs c [ "hotkey" ] // {
      id = lib.toUpper c.id;
      loadsShellEnvironment = true;
      showsInRootSearch = true;
    }) tinycastCommands);
in
{
  imports = [
    ./audio-input.nix
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
    # - Tinycast: define its custom commands. Tinycast reads them as JSON data,
    #   a type system.defaults cannot write. It loads them at launch.
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
      "Slack"
      "Spotify"
      "Tailscale"
      "Tinycast"
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
      launchctl asuser "$(id -u ${cfg.username})" sudo -u ${cfg.username} \
        /usr/bin/defaults write com.abueammar.tinycast customCommands -data \
        "$(printf '%s' ${lib.escapeShellArg tinycastCustomCommands} | /usr/bin/xxd -p | /usr/bin/tr -d '\n')" || true
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
      openssh.authorizedKeys.keys = (import ../ssh-keys.nix).loginList;
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
        "blueutil" # Bluetooth control CLI
        "cloudflared" # Cloudflare Tunnel client
        "codeburn" # AI coding token usage and cost tracker
        "ffmpeg" # media processing (needed by yt-dlp)
        "ghostscript" # PostScript and PDF interpreter
        "gitwatch" # auto-commit git changes
        "gnupg" # gnu privacy guard
        "juanibiapina/taps/gob" # background job manager for coding agents
        "juanibiapina/taps/starmux" # tmux sidebar
        "juanibiapina/taps/todo" # per-directory todo list
        "htop" # interactive process viewer
        "imagemagick" # image manipulation
        "jq" # command-line JSON processor
        "just" # command runner for project recipes
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
        "modrinth" # Minecraft launcher
        "obs"
        "orbstack" # docker https://docs.orbstack.dev/
        "paseo"
        "shottr" # screenshot annotation for pasting into agents
        "slack"
        "spotify"
        "steam"
        { name = "tailscale-app"; greedy = true; } # mesh VPN; greedy so `make` upgrades the self-updating cask
        "the-unarchiver"
        "tigervnc"
        "tinycast" # open source Raycast alternative, runs Raycast extensions
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

        # Herdr: its GPUI renderer thickens glyphs unless font smoothing is
        # off for the app, which makes terminal text bolder than in Ghostty.
        "dev.herdr.app" = {
          AppleFontSmoothing = 0;
        };

        # WhatsApp: a sandboxed Catalyst app that ignores the global smart
        # quotes and dashes settings above, so disable them for the app.
        "net.whatsapp.WhatsApp" = {
          NSAutomaticQuoteSubstitutionEnabled = false;
          NSAutomaticDashSubstitutionEnabled = false;
        };

        # Tailscale (Standalone variant): let brew/make own updates. Disable the
        # in-app Sparkle updater so it stops checking and popping a window at login.
        "io.tailscale.ipn.macsys" = {
          SUEnableAutomaticChecks = false; # no update checks or "new version" prompts
          SUAutomaticallyUpdate = false;   # never self-install; brew owns updates
        };

        # Tinycast 0.12.15 moved from com.tinycast.app to com.abueammar.tinycast.
        # Drop the old domain once Homebrew's cask ships 0.12.15 or later.
        "com.tinycast.app" = tinycastPreferences;
        "com.abueammar.tinycast" = tinycastPreferences;
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
