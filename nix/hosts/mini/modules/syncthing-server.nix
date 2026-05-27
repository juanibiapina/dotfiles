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

  # Ensure syncthing starts after the pcloud rclone mount is ready,
  # otherwise the passwords folder fails its initial scan with
  # "folder marker missing".
  systemd.services.syncthing.after = [ "pcloud-passwords.service" ];
}
