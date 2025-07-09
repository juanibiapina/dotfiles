{ config, lib, pkgs, ... }:
with lib;
let cfg = config.modules.warp; in {
  options.modules.warp = {
    enable = mkEnableOption "warp";
  };
  config = mkIf cfg.enable {
    homebrew.casks = [ "warp" ];
  };
}