{ pkgs, inputs, ... }:

let
  surf-cli = pkgs.buildNpmPackage {
    pname = "surf-cli";
    version = "2.5.0";

    src = inputs.surf-cli;

    npmDepsHash = "sha256-DAaanAyof9RAWFSfpyJjD5wARBgePqZvdTpFIxNJfMc=";

    meta = with pkgs.lib; {
      description = "CLI for AI agents to control Chrome";
      homepage = "https://github.com/juanibiapina/surf-cli";
      license = licenses.mit;
      platforms = platforms.all;
    };
  };
in
{
  environment.systemPackages = [ surf-cli ];
}
