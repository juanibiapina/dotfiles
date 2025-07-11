{ config, lib, ... }:

with lib;

let
  cfg = config.modules.discord;
in
{
  options.modules.discord = {
    enable = mkEnableOption "Discord chat application";
  };

  config = mkIf cfg.enable {
    homebrew = {
      casks = [
        "discord"
      ];
    };
  };
}
