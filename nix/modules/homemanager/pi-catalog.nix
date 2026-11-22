{ config, lib, pkgs, ... }:

let
  command = [
    "${pkgs.nodejs}/bin/node"
    "--disable-warning=ExperimentalWarning"
    "${./pi-catalog/indexer.mjs}"
  ];
  macLog = "${config.home.homeDirectory}/Library/Logs/pi-catalog.log";
in
{
  home.packages = [ pkgs.sqlite ];

  launchd.agents.pi-catalog = lib.mkIf pkgs.stdenv.hostPlatform.isDarwin {
    enable = true;
    config = {
      ProgramArguments = command;
      RunAtLoad = true;
      KeepAlive = true;
      ProcessType = "Background";
      StandardOutPath = macLog;
      StandardErrorPath = macLog;
    };
  };

  systemd.user.services.pi-catalog = lib.mkIf pkgs.stdenv.hostPlatform.isLinux {
    Unit.Description = "Index Pi sessions into ~/.local/state/pi-catalog";
    Service = {
      ExecStart = lib.escapeShellArgs command;
      Restart = "always";
      RestartSec = 5;
    };
    Install.WantedBy = [ "default.target" ];
  };
}
