# MacBook Pro M5 Pro, work machine for GitButler.
{ ... }:

{
  imports = [
    ../../modules/base.nix
    ../../modules/macos/system.nix
  ];

  networking.hostName = "mb5p";

  modules.system.username = "juan";
}
