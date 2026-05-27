{ pkgs, inputs, ... }:

let
  websearch = pkgs.buildNpmPackage {
    pname = "websearch";
    version = "2.0.0";

    src = inputs.websearch;

    npmDepsHash = "sha256-CmH1XgG7D+y5KxowqpeVVHQSYmwah9ZD7y42IZ/pNvY=";

    meta = with pkgs.lib; {
      description = "Multi-provider web search and content extraction CLI";
      homepage = "https://github.com/juanibiapina/websearch";
      license = licenses.mit;
      platforms = platforms.all;
    };
  };
in
{
  environment.systemPackages = [ websearch ];
}
