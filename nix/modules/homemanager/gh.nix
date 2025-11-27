{ pkgs, inputs, ... }:

let
  gh-cleanup-notifications = pkgs.stdenv.mkDerivation {
    pname = "gh-cleanup-notifications";
    version = "0.1.0";

    src = inputs.gh-cleanup-notifications;

    nativeBuildInputs = [ pkgs.makeWrapper ];
    buildInputs = [ pkgs.nodejs_20 ];

    installPhase = ''
      mkdir -p $out/bin
      cp -r . $out/bin/
      chmod +x $out/bin/gh-cleanup-notifications

      wrapProgram $out/bin/gh-cleanup-notifications \
        --prefix PATH : ${pkgs.lib.makeBinPath [ pkgs.nodejs_20 pkgs.moreutils ]}
    '';

    meta = with pkgs.lib; {
      description = "GitHub CLI extension to cleanup notifications";
      homepage = "https://github.com/awendt/gh-cleanup-notifications";
      platforms = platforms.all;
    };
  };
in
{
  programs.gh = {
    enable = true;
    extensions = [
      pkgs.gh-notify
      gh-cleanup-notifications
    ];
  };
}
