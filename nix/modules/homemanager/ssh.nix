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

      settings = {
        "mini" = {
          User = "juan";
          HostName = "mini.tail517bac.ts.net";
          SetEnv = {
            TERM = "xterm-256color";
          };
        };
      };
    };
  };
}
