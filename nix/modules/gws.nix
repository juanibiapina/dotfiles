{ pkgs, inputs, ... }:

{
  environment.systemPackages = [
    inputs.gws.packages."${pkgs.stdenv.hostPlatform.system}".default
    pkgs.google-cloud-sdk
  ];
}
