{ config, lib, pkgs, ... }:
with lib;
let cfg = config.modules.maestral; in {
  options.modules.maestral = {
    enable = mkEnableOption "maestral";

    path = mkOption {
      type = types.str;
      default = "/home/juan/Dropbox";
      description = "Local Dropbox directory path";
    };
  };

  config = mkIf cfg.enable {
    systemd.user.services.maestral = {
      description = "Maestral Dropbox Client";
      wantedBy = [ "default.target" ];
      after = [ "network-online.target" ];
      wants = [ "network-online.target" ];

      serviceConfig = {
        Type = "notify";
        NotifyAccess = "exec";
        WatchdogSec = "30s";
        ExecStartPre = "${pkgs.gnused}/bin/sed -i 's|^path = .*|path = ${cfg.path}|' /home/juan/.config/maestral/maestral.ini";
        ExecStart = "${pkgs.maestral}/bin/maestral start --foreground";
        ExecStop = "${pkgs.maestral}/bin/maestral stop";
        Restart = "on-failure";
        RestartSec = 10;
      };
    };
  };
}
