{ pkgs, inputs, ... }:

let
  websearch = pkgs.buildNpmPackage {
    pname = "websearch";
    version = "1.0.0";

    src = inputs.websearch;

    npmDepsHash = "sha256-rutfR2w9esrdx6TLMU0H1Bz0mFNllgs7iptKk6AagGo=";

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
