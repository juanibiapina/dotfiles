{ config, lib, pkgs, ... }:

let
  port = 6767;
  tailscale = lib.getExe config.services.tailscale.package;
  jq = lib.getExe pkgs.jq;
  startScript = pkgs.writeText "paseo-start.zsh" ''
    export PASEO_LISTEN="$(${tailscale} ip -4):${toString port}"
    export PASEO_HOSTNAMES="$(${tailscale} status --self --json | ${jq} -r '.Self.DNSName | rtrimstr(".")')"
    exec ${pkgs.paseo}/bin/paseo-server
  '';
in
{
  environment.systemPackages = [ pkgs.paseo ];

  systemd.user.services.paseo = {
    description = "Paseo daemon";
    wantedBy = [ "default.target" ];
    serviceConfig = {
      ExecStartPre = "${tailscale} wait";
      ExecStart = "${lib.getExe pkgs.zsh} -l ${startScript}";
      Restart = "always";
      RestartSec = 10;
    };
  };

  networking.firewall.interfaces.tailscale0.allowedTCPPorts = [ port ];
}
