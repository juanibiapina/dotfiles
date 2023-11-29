{ pkgs ? import <nixpkgs> {} }:

let
  nixpkgsConfig = { allowUnfree = true; };
  configuredPkgs = import <nixpkgs> { config = nixpkgsConfig; };
in
{
  system = configuredPkgs.lib.recurseIntoAttrs (
    configuredPkgs.nixos [ ./configuration.nix ]
  );
}
