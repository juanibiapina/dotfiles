{ config, lib, ... }:

with lib;

let
  cfg = config.modules.postman;
in
{
  options.modules.postman = {
    enable = mkEnableOption "Postman API development platform";
  };

  config = mkIf cfg.enable {
    homebrew = {
      enable = true;

      casks = [
        "postman"
      ];
    };
  };
}
