{ config, lib, pkgs, ... }:
with lib;
let cfg = config.modules.maestral; in {
  options.modules.maestral = {
    enable = mkEnableOption "maestral";
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
        ExecStart = "${pkgs.maestral}/bin/maestral start --foreground";
        ExecStop = "${pkgs.maestral}/bin/maestral stop";
        Restart = "on-failure";
        RestartSec = 10;
      };
    };
  };
}
