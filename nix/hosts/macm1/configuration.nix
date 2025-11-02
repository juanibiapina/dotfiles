{
  imports = [
    ../../modules/openssh.nix
    ../../modules/substituters.nix
    ../../modules/macos/system.nix
    ../../modules/macos/gaming.nix
    ../../modules/macos/googlechrome.nix
  ];

  networking.hostName = "macm1";

  # Set username
  modules.system.username = "juan";

  homebrew = {
    brews = [
      "ghostscript"
      "imagemagick"
    ];
    casks = [
      "musescore"
      "slack"
    ];
  };
}
