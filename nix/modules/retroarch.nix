{ config, lib, pkgs, ... }:

with lib;

let
  cfg = config.modules.retroarch;
in
{
  options.modules.retroarch = {
    enable = mkEnableOption "RetroArch emulator";
  };

  config = mkIf cfg.enable {
    homebrew.casks = [ "retroarch" ];
  };
}