{ config, lib, ... }:
with lib;
let cfg = config.modules.ssh; in {
  options.modules.ssh = {
    enable = mkEnableOption "SSH client configuration";
  };

  config = mkIf cfg.enable {
    programs.ssh = {
      enable = true;

      extraConfig = ''
        Host mini
          User juan
          HostName 192.168.188.30
          SetEnv TERM=xterm-256color
      '';
    };
  };
}
