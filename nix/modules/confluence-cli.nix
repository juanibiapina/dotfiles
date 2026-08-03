{ pkgs, inputs, ... }:

let
  confluence-cli = pkgs.buildNpmPackage {
    pname = "confluence-cli";
    version = (pkgs.lib.importJSON "${inputs.confluence-cli}/package.json").version;

    src = inputs.confluence-cli;

    npmDepsHash = "sha256-23Q7WigPqLiTPW01Iu/jDVtlnAvYgZZDSAxf5HfcgJ4=";

    dontNpmBuild = true;

    meta = with pkgs.lib; {
      description = "Command-line interface for Atlassian Confluence";
      homepage = "https://github.com/pchuri/confluence-cli";
      license = licenses.mit;
      platforms = platforms.all;
    };
  };
in
{
  environment.systemPackages = [ confluence-cli ];
}
