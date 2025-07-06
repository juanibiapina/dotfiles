{ config, lib, pkgs, ... }:

with lib;

let
  cfg = config.modules.googlechrome;
in
{
  options.modules.googlechrome = {
    enable = mkEnableOption "Google Chrome browser";
  };

  config = mkIf cfg.enable {
    homebrew = {
      enable = true;

      casks = [
        "google-chrome"
      ];
    };
  };
}