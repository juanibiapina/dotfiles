{ pkgs, inputs, lib, ... }:

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
  options.packages.browse-cli = lib.mkOption {
    type = lib.types.package;
    default = browse-cli;
    readOnly = true;
    description = "The browse-cli package";
  };

  config.environment.systemPackages = [ browse-cli ];
}
