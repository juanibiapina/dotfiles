{ lib, ... }:

{
  imports = [ ../syncthing.nix ];

  # Keep Syncthing running after Home Manager gracefully stops it while
  # refreshing launchd agents.
  launchd.agents.syncthing.config = {
    RunAtLoad = true;
    KeepAlive = lib.mkForce true;
  };
}
