{ config, lib, ... }:

with lib;

let
  cfg = config.modules.charm;
in
{
  options.modules.charm = {
    enable = mkEnableOption "Charm CLI tools";
  };

  config = mkIf cfg.enable {
    homebrew = {
      brews = [
        "glow" # terminal markdown viewer
        "gum" # shell scripting UI toolkit
        "mods" # AI on the CLI with pipes
      ];
    };
  };
}
