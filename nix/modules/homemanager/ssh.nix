{ config, lib, ... }:
with lib;
let cfg = config.modules.ssh; in {
  options.modules.ssh = {
    enable = mkEnableOption "SSH client configuration";
  };

  config = mkIf cfg.enable {
    programs.ssh = {
      enable = true;
      enableDefaultConfig = false;

      matchBlocks = {
        "mini" = {
          user = "juan";
          hostname = "192.168.188.30";
          extraOptions = {
            SetEnv = "TERM=xterm-256color";
          };
        };
      };
    };
  };
}
