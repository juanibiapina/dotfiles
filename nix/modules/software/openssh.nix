{ config, lib, ... }:

with lib;

let
  cfg = config.modules.openssh;
in
{
  options.modules.openssh = {
    enable = mkEnableOption "OpenSSH daemon";
  };

  config = mkIf cfg.enable {
    # Enable the OpenSSH daemon.
    # On darwin this enables Apple's built-in OpenSSH server.
    # To generates the SSH host keys in /etc/ssh, run `ssh localhost` once.
    services.openssh.enable = true;
  };
}

