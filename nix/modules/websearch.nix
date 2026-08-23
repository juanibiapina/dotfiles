{ pkgs, inputs, ... }:

let
  websearch = pkgs.buildNpmPackage {
    pname = "websearch";
    version = "2.3.0";

    src = inputs.websearch;

    npmDepsHash = "sha256-Q+d9tfF6aX+rIvQrOr3TsUYJHNGkuiYiHaHHkyYxtR0=";

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
