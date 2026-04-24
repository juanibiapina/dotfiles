{ pkgs, ... }:

let
  alpaca-cli = import ../../packages/alpaca-cli.nix { inherit pkgs; };
in
{
  imports = [
    ../../modules/base.nix
    ../../modules/macos/system.nix
  ];

  networking.hostName = "macm1";

  modules.system.username = "juan";

  environment.systemPackages = [
    alpaca-cli
  ];

  homebrew = {
    brews = [
      "ghostscript"
      "imagemagick"
    ];
    casks = [
      "google-chrome"
      "heroic"
      "obs"
      "retroarch"
      "slack"
      "steam"
    ];
  };
}
