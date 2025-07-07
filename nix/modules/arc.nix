{ config, lib, pkgs, ... }:

with lib;

let
  cfg = config.modules.arc;
in
{
  options.modules.arc = {
    enable = mkEnableOption "Arc browser";
  };

  config = mkIf cfg.enable {
    homebrew = {
      enable = true;

      casks = [
        "arc"
      ];
    };
  };
}