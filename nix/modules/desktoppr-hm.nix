{ config, lib, pkgs, ... }:

with lib;

let
  cfg = config.modules.desktoppr-hm;
  wallpaper = "${../../assets/wallpapers/tokyonight-background.ppm}";
in
{
  options.modules.desktoppr-hm = {
    enable = mkEnableOption "desktoppr wallpaper management via Home Manager";
  };

  config = mkIf cfg.enable {
    launchd.agents.desktoppr = {
      enable = true;
      config = {
        ProgramArguments = [
          "/usr/local/bin/desktoppr"
          "0"
          "${wallpaper}"
        ];
        RunAtLoad = true;
        StandardOutPath = "/tmp/desktoppr.out";
        StandardErrorPath = "/tmp/desktoppr.err";
      };
    };
  };
}