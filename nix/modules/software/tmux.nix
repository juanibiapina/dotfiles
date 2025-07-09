{ config, lib, pkgs, ... }:

with lib;

let
  cfg = config.modules.tmux;
in
{
  options.modules.tmux = {
    enable = mkEnableOption "tmux terminal multiplexer";
  };

  config = mkIf cfg.enable {
    environment.systemPackages = with pkgs; [
      gitmux
      tmux
    ];
  };
}