{ pkgs, inputs, ... }:

let
  confluence-cli = pkgs.buildNpmPackage {
    pname = "confluence-cli";
    version = "1.13.0";

    src = inputs.confluence-cli;

    npmDepsHash = "sha256-fNX5gQIVg20o2ySbvg6wKcykfbHPNTbp2bIQEwAnBSg=";

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
