{ config, lib, pkgs, ... }:

with lib;

let
  cfg = config.modules.python;
in
{
  options.modules.python = {
    enable = mkEnableOption "Python development environment";
  };

  config = mkIf cfg.enable {
    homebrew = {
      enable = true;

      brews = [
        "uv"
      ];
    };
  };
}
