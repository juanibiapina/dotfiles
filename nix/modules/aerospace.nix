{ config, lib, ... }:

with lib;

let
  cfg = config.modules.aerospace;
in
{
  options.modules.aerospace = {
    enable = mkEnableOption "AeroSpace window manager for macOS";
  };

  config = mkIf cfg.enable {
    homebrew = {
      enable = true;

      taps = [
        "nikitabobko/tap" # aerospace tap
      ];

      casks = [
        "aerospace" # window manager for macOS
      ];
    };

    system.defaults = {
      dock = {
        expose-group-apps = true; # workaround for using mission control with aerospace
      };

      spaces.spans-displays = false; # disable "Displays have separate spaces", which works better with aerospace
    };
  };
}
