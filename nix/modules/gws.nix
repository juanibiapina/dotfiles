{ pkgs, inputs, ... }:

let
  gws = inputs.gws.packages."${pkgs.stdenv.hostPlatform.system}".default.overrideAttrs (old: {
    cargoDeps = pkgs.rustPlatform.fetchCargoVendor {
      src = old.src;
      hash = "sha256-8vVTACodxxju4x19bNzDKM5xn6btV1UCh+5GUxS70S8=";
    };
  });
in
{
  environment.systemPackages = [
    gws
    pkgs.google-cloud-sdk
  ];
}
