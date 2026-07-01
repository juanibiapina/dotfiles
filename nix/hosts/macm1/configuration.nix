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
    taps = [
      "juanibiapina/taps"
    ];

    brews = [
      "juanibiapina/taps/deltoids"
      "ghostscript"
      "imagemagick"
    ];
    casks = [
      "bitwarden"
      "google-chrome"
      "heroic"
      "modrinth"
      "obs"
      "retroarch"
      "slack"
      "steam"
    ];
  };
}
