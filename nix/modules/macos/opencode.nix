{ config, lib, ... }:

with lib;

let
  cfg = config.modules.opencode;
in
{
  options.modules.opencode = {
    enable = mkEnableOption "OpenCode AI code editor";
  };

  config = mkIf cfg.enable {
    homebrew = {
      enable = true;

      taps = [
        "opencode-ai/tap"
      ];

      brews = [
        "opencode"
      ];
    };
  };
}
