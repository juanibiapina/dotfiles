{ pkgs, inputs, ... }:

let
  gogcli = pkgs.gogcli.overrideAttrs (finalAttrs: old: {
    version = "0.48.1";
    src = inputs.gogcli;
    vendorHash = "sha256-18pPtme/0QoeX1PkCdlhWStX3MYJT83ULHSJI3RIOlo=";
  });

  gog = pkgs.writeShellApplication {
    name = "gog";
    runtimeEnv.GOG_REAL = "${gogcli}/bin/gog";
    text = builtins.readFile ./gog-guard.bash;
  };
in
{
  environment.systemPackages = [ gog ];
}
