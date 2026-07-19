{ config, lib, pkgs, ... }:
with lib;
let cfg = config.modules.notes; in {
  options.modules.notes = {
    enable = mkEnableOption "notes";
  };

  config = mkIf cfg.enable {
    # Autocommit notes on change
    systemd.services.gitwatch-notes = {
      description = "gitwatch for notes";
      wantedBy = [ "default.target" ];
      after = [ "network.target" ];

      serviceConfig = {
        User = "juan";
        Group = "users";
        WorkingDirectory = "/home/juan/Sync/notes";
        ExecStart = "${pkgs.gitwatch}/bin/gitwatch -r origin .";
        Restart = "always";
        RestartSec = 10;
        Environment = "PATH=${pkgs.git}/bin:${pkgs.gnupg}/bin:${pkgs.openssh}/bin:$PATH";
      };
    };
  };
}
