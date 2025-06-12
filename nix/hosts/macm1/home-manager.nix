{ pkgs, ... }:

{
  imports = [
    ../../modules/syncthing.nix
  ];

  # Home Manager required configuration
  home.username = "juan";

  # This value determines the Home Manager release that your configuration is
  # compatible with. This helps avoid breakage when a new Home Manager release
  # introduces backwards incompatible changes.
  #
  # You should not change this value, even if you update Home Manager. If you do
  # want to update the value, then make sure to first check the Home Manager
  # release notes.
  home.stateVersion = "23.11"; # Please read the comment before changing.

  # Configure ssh aliases
  programs.ssh = {
    enable = true;

    extraConfig = ''
      Host desktop
        User juan
        HostName 192.168.188.109

      Host mini
        User juan
        HostName 192.168.188.30
    '';
  };

  programs.alacritty = {
    enable = true;
    package = pkgs.hello; # alacritty is installed as a cask instead of a Nix package
    settings = {
      colors = {
        draw_bold_text_with_bright_colors = false;

        bright = {
          black = "0x0387ad";
          blue = "0x839496";
          cyan = "0x93a1a1";
          green = "0x586e75";
          magenta = "0x6c71c4";
          red = "0xcb4b16";
          white = "0xfdf6e3";
          yellow = "0x657b83";
        };

        cursor = {
          cursor = "0x839496";
          text = "0x002b36";
        };

        normal = {
          black = "0x073642";
          blue = "0x268bd2";
          cyan = "0x2aa198";
          green = "0x859900";
          magenta = "0xd33682";
          red = "0xdc322f";
          white = "0xeee8d5";
          yellow = "0xb58900";
        };

        primary = {
          background = "0x002b36";
          foreground = "0x839496";
        };
      };

      env = {
        TERM = "xterm-256color";
      };

      font = {
        size = 20;

        normal = {
          family = "SauceCodePro Nerd Font";
          style = "Regular";
        };
      };

      keyboard = {
        bindings = [
          {
            action = "ToggleSimpleFullscreen";
            key = "F";
            mods = "Command";
          }
        ];
      };

      mouse = {
        hide_when_typing = true;
      };

      window = {
        decorations = "none";
        startup_mode = "SimpleFullscreen";
        title = "Alacritty";
      };
    };
  };

  # The home.packages option allows you to install Nix packages into your
  # environment.
  home.packages = [
    # # Adds the 'hello' command to your environment. It prints a friendly
    # # "Hello, world!" when run.
    # pkgs.hello

    # # You can also create simple shell scripts directly inside your
    # # configuration. For example, this adds a command 'my-hello' to your
    # # environment:
    # (pkgs.writeShellScriptBin "my-hello" ''
    #   echo "Hello, ${config.home.username}!"
    # '')
  ];

  # Home Manager is pretty good at managing dotfiles. The primary way to manage
  # plain files is through 'home.file'.
  home.file = {
    # # Building this configuration will create a copy of 'dotfiles/screenrc' in
    # # the Nix store. Activating the configuration will then make '~/.screenrc' a
    # # symlink to the Nix store copy.
    # ".screenrc".source = dotfiles/screenrc;

    # # You can also set the file content immediately.
    # ".gradle/gradle.properties".text = ''
    #   org.gradle.console=verbose
    #   org.gradle.daemon.idletimeout=3600000
    # '';
  };

  # Home Manager can also manage your environment variables through
  # 'home.sessionVariables'. These will be explicitly sourced when using a
  # shell provided by Home Manager. If you don't want to manage your shell
  # through Home Manager then you have to manually source 'hm-session-vars.sh'
  # located at either
  #
  #  ~/.nix-profile/etc/profile.d/hm-session-vars.sh
  #
  # or
  #
  #  ~/.local/state/nix/profiles/profile/etc/profile.d/hm-session-vars.sh
  #
  # or
  #
  #  /etc/profiles/per-user/juan/etc/profile.d/hm-session-vars.sh
  #
  home.sessionVariables = {
    # EDITOR = "emacs";
  };
}
