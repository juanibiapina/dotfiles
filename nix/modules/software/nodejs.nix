{ config, lib, pkgs, ... }:

with lib;

let
  cfg = config.modules.nodejs;
in
{
  options.modules.nodejs = {
    enable = mkEnableOption "Node.js development environment";
  };

  config = mkIf cfg.enable {
    environment.systemPackages = with pkgs; [
      nodePackages.typescript-language-server
    ];

    homebrew = {
      brews = [
        "mise" # version manager
        "node" # Node.js runtime
      ];
    };
  };
}
