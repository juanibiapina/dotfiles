{
  imports = [
    ../../modules/base.nix
    ../../modules/macos/system.nix
  ];

  networking.hostName = "macm1";

  modules.system.username = "juan";

  homebrew = {
    brews = [
      "ghostscript"
      "imagemagick"
    ];
    casks = [
      "google-chrome"
      "retroarch"
      "slack"
    ];
  };
}
