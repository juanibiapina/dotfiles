{ pkgs, inputs, ... }:

let
  confluence-cli = pkgs.buildNpmPackage {
    pname = "confluence-cli";
    version = (pkgs.lib.importJSON "${inputs.confluence-cli}/package.json").version;

    src = inputs.confluence-cli;

    npmDepsHash = "sha256-hpa7jSXZkIMS0k3z1BZQrkIC/PjQeqnWZb3RDbdnSAA=";

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
