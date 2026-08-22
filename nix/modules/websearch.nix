{ pkgs, inputs, ... }:

let
  websearch = pkgs.buildNpmPackage {
    pname = "websearch";
    version = "2.2.0";

    src = inputs.websearch;

    npmDepsHash = "sha256-PdflTu2jwBUrX/mRK6hAnvSReY6xmqLtVeMf5dj7NHQ=";

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
