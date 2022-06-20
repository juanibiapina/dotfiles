{ pkgs ? import <nixpkgs> {
    config = { allowUnfree = true; };
  }
}:

{
  system = pkgs.lib.recurseIntoAttrs (
    pkgs.nixos [ ./configuration.nix ]
  );
}
