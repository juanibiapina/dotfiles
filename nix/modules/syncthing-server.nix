{
  imports = [
    ./syncthing.nix
  ];

  services.syncthing = {
    user = "juan";
    dataDir = "/home/juan/Sync";
    configDir = "/home/juan/.config/syncthing";
    guiAddress = "192.168.188.30:8384";
    openDefaultPorts = true;
  };
}
