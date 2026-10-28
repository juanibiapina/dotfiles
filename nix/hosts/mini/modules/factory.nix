{ lib, pkgs, ... }:

let
  orca = pkgs.writeShellScriptBin "orca" ''
    exec ${lib.getExe (import ../../../packages/orca.nix { inherit pkgs; })} "$@"
  '';
  pickupScript = pkgs.writeText "factory-pickup.zsh" ''
    export PATH="${orca}/bin:$PATH"
    exec dev factory pickup
  '';
in
{
  systemd.user.services.factory-pickup = {
    description = "Start factory coordinators for issues labeled factory";
    after = [ "orca.service" ];
    serviceConfig = {
      Type = "oneshot";
      ExecStart = "${lib.getExe pkgs.zsh} -l -i ${pickupScript}";
    };
  };

  systemd.user.timers.factory-pickup = {
    description = "Check for issues labeled factory every 5 minutes";
    wantedBy = [ "timers.target" ];
    timerConfig.OnCalendar = "*:0/5";
  };
}
