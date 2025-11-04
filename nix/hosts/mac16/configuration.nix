{
  imports = [
    ../../modules/base.nix
    ../../modules/macos/system.nix
  ];

  networking.hostName = "juanibiapina"; # this is enforced by Contentful

  modules.system.username = "juan.ibiapina";

  homebrew = {
    casks = [
      "betterdisplay" # external monitor management
      "hammerspoon"
    ];
  };
}
