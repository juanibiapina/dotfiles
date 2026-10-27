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
      "stablyai/orca"
    ];
    brews = [
      "ghostscript"
      "imagemagick"
    ];
    casks = [
      "heroic"
      "modrinth"
      "obs"
      "stablyai/orca/orca" # client for the Orca server on mini
      "retroarch"
      "steam"
    ];
  };
}
