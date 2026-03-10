{ pkgs, inputs, ... }:

let
  websearch = pkgs.buildNpmPackage {
    pname = "websearch";
    version = "1.0.0";

    src = inputs.websearch;

    npmDepsHash = "sha256-G5XutyxRieQ7p8/je4XR7KiT9Trdh4MaiAFfP3bUM7c=";

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
