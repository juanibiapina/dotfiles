{ pkgs, inputs, ... }:

let
  gdcli = pkgs.buildNpmPackage {
    pname = "gdcli";
    version = "0.1.1";

    src = inputs.gdcli;

    npmDepsHash = "sha256-IR8ECKckJF2ILFaIaGfUWLPpWjfxoeE2iZKZU2tZsd0=";

    meta = with pkgs.lib; {
      description = "Minimal Google Drive CLI";
      homepage = "https://github.com/badlogic/gdcli";
      license = licenses.mit;
      platforms = platforms.all;
    };
  };
in
{
  environment.systemPackages = [ gdcli ];
}
