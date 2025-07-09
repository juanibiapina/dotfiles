{ config, lib, ... }:

with lib;

let
  cfg = config.modules.docker;
in
{
  options.modules.docker = {
    enable = mkEnableOption "Docker container platform";
  };

  config = mkIf cfg.enable {
    homebrew = {
      casks = [
        "orbstack" # https://docs.orbstack.dev/
      ];
    };
  };
}
