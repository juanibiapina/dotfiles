{ config, lib, pkgs, ... }:

with lib;

let
  cfg = config.modules.desktoppr;
in
{
  options.modules.desktoppr = {
    enable = mkEnableOption "desktoppr wallpaper management tool";
  };

  config = mkIf cfg.enable {
    homebrew = {
      enable = true;

      casks = [
        "desktoppr"
      ];
    };

  };
}
