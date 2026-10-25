{ config, lib, pkgs, ... }:

let
  port = 6768;
  orca = import ../../../packages/orca.nix { inherit pkgs; };
  tailscale = lib.getExe config.services.tailscale.package;
  startScript = pkgs.writeText "orca-start.zsh" ''
    exec ${lib.getExe orca} serve --supervise --port ${toString port} --pairing-address "$(${tailscale} ip -4)"
  '';
in
{
  environment.systemPackages = [ orca ];

  systemd.user.services.orca = {
    description = "Orca server";
    wantedBy = [ "default.target" ];
    serviceConfig = {
      ExecStartPre = "${tailscale} wait";
      ExecStart = "${lib.getExe pkgs.zsh} -l -i ${startScript}";
      Restart = "always";
      RestartSec = 10;
    };
  };

  networking.firewall.interfaces.tailscale0.allowedTCPPorts = [ port ];
}
