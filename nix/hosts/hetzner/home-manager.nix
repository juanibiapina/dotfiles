{ lib, ... }:

{
  imports = [
    ../../modules/syncthing.nix
    ../../modules/homemanager/agents.nix
    ../../modules/homemanager/bat.nix
    ../../modules/homemanager/gh.nix
    ../../modules/homemanager/pi-extensions.nix
    ../../modules/homemanager/browse-cli.nix
  ];

  home.username = "juan";

  # Only the KeePass database, so kp works here. Syncthing made the device key on first setup, in
  # ~/.local/state/syncthing; a reinstall makes a new one, whose ID goes in nix/modules/syncthing.nix.
  services.syncthing.settings.folders = lib.mkForce {
    passwords = {
      path = "~/Sync/passwords";
      devices = [ "mini" "macm1" "mb5p" ];
    };
  };

  # Home Manager release this config was first written against. Do not bump.
  home.stateVersion = "26.11";
}
