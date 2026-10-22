{ pkgs, inputs, ... }:

let
  gogcli = pkgs.gogcli.overrideAttrs (finalAttrs: old: {
    version = "0.46.0";
    src = inputs.gogcli;
    vendorHash = "sha256-eVNA6BoZkxUkX1qYrO/ILXMxPfDyu/uuZMDi+8hpovM=";
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
