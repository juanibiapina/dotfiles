{ pkgs }:

pkgs.stdenv.mkDerivation rec {
  pname = "gob";
  version = "3.8.0";

  src = pkgs.fetchurl {
    url = "https://github.com/juanibiapina/gob/releases/download/v${version}/gob_${version}_linux_amd64.tar.gz";
    hash = "sha256-BGqoMFuBuhqvEbor5OIBdWY3Ej/l4cx8RcSkW9ME7OQ=";
  };

  sourceRoot = ".";

  installPhase = ''
    mkdir -p $out/bin
    cp gob $out/bin/
  '';

  meta = with pkgs.lib; {
    description = "Process manager for AI agents (and humans)";
    homepage = "https://github.com/juanibiapina/gob";
    platforms = [ "x86_64-linux" ];
  };
}
