{ lib, pkgs, ... }:

let
  startScript = pkgs.writeText "herdr-core-start.zsh" ''
    exec "$HOME/.local/bin/herdr-core" server start
  '';
in
{
  systemd.user.services.herdr-core = {
    description = "Start herdr-core";
    wantedBy = [ "default.target" ];
    unitConfig.ConditionPathExists = "%h/.local/bin/herdr-core";
    serviceConfig = {
      Type = "oneshot";
      RemainAfterExit = true;
      KillMode = "process";
      ExecStart = "${lib.getExe pkgs.zsh} -l -i ${startScript}";
    };
  };
}
