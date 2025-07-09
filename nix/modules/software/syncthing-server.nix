{ config, lib, ... }:

with lib;

let
  cfg = config.modules.syncthing-server;
in
{
  options.modules.syncthing-server = {
    enable = mkEnableOption "Syncthing server configuration";
  };

  config = mkIf cfg.enable {
    # Enable the base syncthing module
    modules.syncthing.enable = true;

    services.syncthing = {
      user = "juan";
      dataDir = "/home/juan/Sync";
      configDir = "/home/juan/.config/syncthing";
      openDefaultPorts = true;
    };
  };
}
