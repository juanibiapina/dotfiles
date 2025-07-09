{ config, lib, ... }:

with lib;

let
  cfg = config.modules.doppler;
in
{
  options.modules.doppler = {
    enable = mkEnableOption "Doppler secrets management";
  };

  config = mkIf cfg.enable {
    # https://docs.doppler.com/docs/cli#installation
    homebrew = {
      taps = [
        "dopplerhq/cli"
      ];

      brews = [
        # dependencies
        "gnupg"

        "doppler"
      ];
    };
  };
}
