{ config, inputs, pkgs, ... }:

let
  recorder = inputs.self.packages.${pkgs.stdenv.hostPlatform.system}.moonlander-recorder;
  log = "${config.home.homeDirectory}/Library/Logs/moonlander-recorder.log";
in
{
  launchd.agents.moonlander-recorder = {
    enable = true;
    config = {
      ProgramArguments = [ "${recorder}/bin/moonlander-recorder" "${config.home.homeDirectory}/Sync/moonlander" ];
      RunAtLoad = true;
      KeepAlive = true;
      ProcessType = "Background";
      StandardOutPath = log;
      StandardErrorPath = log;
    };
  };
}
