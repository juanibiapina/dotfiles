{ config, pkgs, ... }:

{
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
  #programs.ssh = {
  #  enable = true;

  #  extraConfig = ''
  #    Host desktop
  #      User juan
  #      HostName 192.168.188.109

  #    Host mini
  #      User juan
  #      HostName 192.168.188.30
  #  '';
  #};

  stylix = {
    enable = true;
    autoEnable = false;
    targets.alacritty.enable = false;
  };

programs.alacritty = {
  enable = true;
  settings = {
    colors = {
      draw_bold_text_with_bright_colors = false;

      bright = {
        black = "0x0387ad"; # this color was replaced by me, originally it was the same as primary background = "0x002b36";
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
      size = 16;

      normal = {
        family = "Source Code Pro";
        style = "Regular";
      };
    };

    mouse = {
      hide_when_typing = true;
    };

    terminal = {
      shell = {
        args = [ "--login" ];
        program = "/run/current-system/sw/bin/zsh";
      };
    };

    window = {
      startup_mode = "Windowed";
      title = "Alacritty";
    };
  };
};

  home.file = {
    ".config/nix/nix.conf".text = ''
      keep-derivations = true
      keep-outputs = true
      experimental-features = nix-command flakes
      substituters = https://cache.nixos.org https://juanibiapina.cachix.org https://devenv.cachix.org https://nix-community.cachix.org
      trusted-public-keys = cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY= juanibiapina.cachix.org-1:bUZRS3Ty+eSUDlN+nMxpnvRprzgPouA19C9MjApilvo= devenv.cachix.org-1:w1cLUi8dv3hnoSPGAuibQv+f9TZLr6cv/Hm9XgU50cw= nix-community.cachix.org-1:mB9FSh9qf2dCimDSUo8Zy7bkq5CX+/rkCWyvRCYg3Fs=
    '';
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
  #  /etc/profiles/per-user/jibiapina/etc/profile.d/hm-session-vars.sh
  #
  home.sessionVariables = {
    # EDITOR = "emacs";
  };
}
