{ config, lib, pkgs, ... }:
with lib;
let cfg = config.modules.dotfiles-autoupdate; in {
  options.modules.dotfiles-autoupdate = {
    enable = mkEnableOption "dotfiles-autoupdate";
  };

  config = mkIf cfg.enable {
    systemd.services.dotfiles-autoupdate = {
      description = "Pull dotfiles and re-link stow packages";
      after = [ "network-online.target" ];
      wants = [ "network-online.target" ];

      path = with pkgs; [ git openssh stow findutils gnumake coreutils ];

      serviceConfig = {
        Type = "oneshot";
        User = "juan";
        Group = "users";
        WorkingDirectory = "/home/juan/workspace/juanibiapina/dotfiles";
      };

      script = ''
        echo "Pulling latest dotfiles..."
        git pull --ff-only origin main

        echo "Linking dotfiles..."
        ./scripts/link-dotfiles.bash
      '';
    };

    systemd.timers.dotfiles-autoupdate = {
      description = "Daily dotfiles pull and stow";
      wantedBy = [ "timers.target" ];

      timerConfig = {
        OnCalendar = "*-*-* 04:00:00";
        Persistent = true;
      };
    };
  };
}
