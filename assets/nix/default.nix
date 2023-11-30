{ pkgs ? import <nixpkgs> {} }:

{
  system = pkgs.lib.recurseIntoAttrs (
    pkgs.nixos [ ./configuration.nix ]
  );
}
