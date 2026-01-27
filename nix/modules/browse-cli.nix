{ pkgs, inputs, ... }:

let
  browse-cli = pkgs.buildNpmPackage {
    pname = "browse-cli";
    version = "3.0.0";

    src = inputs.browse-cli;

    npmDepsHash = "sha256-QgndVBH8Id0d8WkI/zDD3Waar7KNggiYMfiPcijwDlM=";

    meta = with pkgs.lib; {
      description = "CLI for AI agents to control Chrome";
      homepage = "https://github.com/juanibiapina/browse-cli";
      license = licenses.mit;
      platforms = platforms.all;
    };
  };
in
{
  environment.systemPackages = [ browse-cli ];
}
