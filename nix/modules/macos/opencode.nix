{ config, lib, ... }:

with lib;

let
  cfg = config.modules.opencode;
in
{
  options.modules.opencode = {
    enable = mkEnableOption "OpenCode";
  };

  config = mkIf cfg.enable {
    homebrew = {
      taps = [
        "sst/tap"
      ];
      brews = [
        "opencode"
      ];
    };
  };
}