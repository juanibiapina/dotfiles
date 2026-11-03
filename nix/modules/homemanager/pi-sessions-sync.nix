{ config, ... }:

{
  # Point pi's hardcoded session dir at the ~/Sync/pi-sessions Syncthing folder
  # (declared in nix/modules/syncthing.nix) so sessions sync across machines.
  # force self-heals if a running pi recreates the path as a real directory;
  # never rm this symlink by hand while pi runs, pi recreates it as a dir.
  home.file.".pi/agent/sessions" = {
    source = config.lib.file.mkOutOfStoreSymlink "${config.home.homeDirectory}/Sync/pi-sessions";
    force = true;
  };
}
