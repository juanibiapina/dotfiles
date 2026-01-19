{ pkgs, inputs, ... }:

let
  gccli = pkgs.buildNpmPackage {
    pname = "gccli";
    version = "0.1.2";

    src = inputs.gccli;

    npmDepsHash = "sha256-y0vj9qwou9Ebb+rR+AP3yxfmfH8Zu9jTqjzZekShe80=";

    meta = with pkgs.lib; {
      description = "Minimal Google Calendar CLI";
      homepage = "https://github.com/badlogic/gccli";
      license = licenses.mit;
      platforms = platforms.all;
    };
  };
in
{
  environment.systemPackages = [ gccli ];
}
