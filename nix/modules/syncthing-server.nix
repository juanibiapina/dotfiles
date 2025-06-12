{
  imports = [
    ./syncthing.nix
  ];

  services.syncthing = {
    user = "juan";
    dataDir = "/home/juan/Sync";
    configDir = "/home/juan/.config/syncthing";
    openDefaultPorts = true;
  };
}
