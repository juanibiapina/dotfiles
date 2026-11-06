{
  imports = [
    ../../../modules/syncthing.nix
  ];

  services.syncthing = {
    user = "juan";
    dataDir = "/home/juan/Sync";
    configDir = "/home/juan/.config/syncthing";
    openDefaultPorts = true;
    # Hetzner's Minecraft backups: it keeps the newest two, and its deletions reach here too.
    settings.folders.minecraft-backups = {
      path = "~/Sync/minecraft-backups";
      devices = [ "hetzner" ];
      type = "receiveonly";
    };
  };
}
