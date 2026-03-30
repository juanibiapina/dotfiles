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

  gh-news = pkgs.rustPlatform.buildRustPackage {
    pname = "gh-news";
    version = "0.10.0";

    src = inputs.gh-news;

    cargoLock = {
      lockFile = inputs.gh-news + "/Cargo.lock";
    };

    meta = with pkgs.lib; {
      description = "Terminal UI for GitHub notifications";
      homepage = "https://github.com/chmouel/gh-news";
      platforms = platforms.all;
    };
  };

  gh-notify-await = pkgs.stdenv.mkDerivation {
    pname = "gh-notify-await";
    version = "0.1.0";

    src = inputs.gh-notify-await;

    nativeBuildInputs = [ pkgs.makeWrapper ];

    installPhase = ''
      mkdir -p $out/bin
      cp gh-notify-await $out/bin/
      chmod +x $out/bin/gh-notify-await

      wrapProgram $out/bin/gh-notify-await \
        --prefix PATH : ${pkgs.lib.makeBinPath [ pkgs.jq ]}
    '';

    meta = with pkgs.lib; {
      description = "GitHub CLI extension that waits for notifications";
      homepage = "https://github.com/juanibiapina/gh-notify-await";
      platforms = platforms.all;
    };
  };

  gh-pr-await = pkgs.stdenv.mkDerivation {
    pname = "gh-pr-await";
    version = "0.1.0";

    src = inputs.gh-pr-await;

    nativeBuildInputs = [ pkgs.makeWrapper ];

    installPhase = ''
      mkdir -p $out/bin
      cp gh-pr-await $out/bin/
      chmod +x $out/bin/gh-pr-await

      wrapProgram $out/bin/gh-pr-await \
        --prefix PATH : ${pkgs.lib.makeBinPath [ pkgs.jq ]}
    '';

    meta = with pkgs.lib; {
      description = "GitHub CLI extension that polls a PR until it changes";
      homepage = "https://github.com/juanibiapina/gh-pr-await";
      platforms = platforms.all;
    };
  };

in
{
  programs.gh = {
    enable = true;
    extensions = [
      gh-cleanup-notifications
      gh-news
      gh-notify-await
      gh-pr-await
    ];
  };
}
