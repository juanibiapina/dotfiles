{ lib, pkgs, ... }:

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
    # The Minecraft server's daily backups (juanibiapina/minecraft bin/backup keeps the newest two); mini mirrors them.
    minecraft-backups = {
      path = "~/Sync/minecraft-backups";
      devices = [ "mini" ];
      type = "sendonly";
    };
  };

  systemd.user.services.minecraft-backup = {
    Unit.Description = "Back up the Minecraft server into ~/Sync/minecraft-backups";
    Service = {
      Type = "oneshot";
      ExecStart = "/home/juan/workspace/juanibiapina/minecraft/bin/backup";
      Environment = "PATH=${lib.makeBinPath [ pkgs.mcrcon ]}:/run/current-system/sw/bin";
    };
  };
  systemd.user.timers.minecraft-backup = {
    Unit.Description = "Daily Minecraft backup";
    Timer = {
      OnCalendar = "*-*-* 05:00:00";
      Persistent = true;
    };
    Install.WantedBy = [ "timers.target" ];
  };

  # Home Manager release this config was first written against. Do not bump.
  home.stateVersion = "26.11";
}
