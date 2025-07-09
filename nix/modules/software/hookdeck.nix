{ config, lib, ... }:

with lib;

let
  cfg = config.modules.hookdeck;
in
{
  options.modules.hookdeck = {
    enable = mkEnableOption "Hookdeck webhook gateway";
  };

  config = mkIf cfg.enable {
    homebrew = {
      enable = true;

      taps = [
        "hookdeck/hookdeck"
      ];

      brews = [
        "hookdeck"
      ];
    };
  };
}
