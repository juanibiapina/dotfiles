{
  imports = [
    ../../modules/openssh.nix
    ../../modules/substituters.nix
    ../../modules/macos/system.nix
  ];

  networking.hostName = "juanibiapina"; # this is enforced by Contentful

  # Set username
  modules.system.username = "juan.ibiapina";

  homebrew = {
    casks = [
      "betterdisplay" # for managing external displays
      "hammerspoon"
    ];
  };
}
