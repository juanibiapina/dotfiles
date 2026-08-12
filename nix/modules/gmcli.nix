{ pkgs, inputs, ... }:

let
  gmcli = pkgs.buildNpmPackage {
    pname = "gmcli";
    version = "0.2.0";

    src = inputs.gmcli;

    npmDepsHash = "sha256-+dc80YDckASN1OvibJt33EUmkluVgh6y7LQj+KmE11c=";

    meta = with pkgs.lib; {
      description = "Minimal Gmail CLI";
      homepage = "https://github.com/badlogic/gmcli";
      license = licenses.mit;
      platforms = platforms.all;
    };
  };
in
{
  environment.systemPackages = [ gmcli ];
}
