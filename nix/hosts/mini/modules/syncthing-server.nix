{
  imports = [
    ../../../modules/syncthing.nix
  ];

  services.syncthing = {
    user = "juan";
    dataDir = "/home/juan/Sync";
    configDir = "/home/juan/.config/syncthing";
    openDefaultPorts = true;
  };

  # Ordering against the pcloud rclone mount lives in ./pcloud-passwords.nix,
  # next to the readiness gate that makes the ordering meaningful.
}
