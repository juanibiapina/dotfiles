{ self, pkgs, lib, config, ... }:

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

    system.defaults = {
      dock = {
        autohide = true;
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
