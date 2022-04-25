{ stdenv, fetchurl, lib, appimageTools }:

let
  version = "0.6.3";
in appimageTools.wrapType2 rec {
  name = "hamsket";

  src = {
    x86_64-linux = fetchurl {
      url = "https://github.com/TheGoddessInari/hamsket/releases/download/${version}/Hamsket-${version}.AppImage";
      sha256 = "nkQMr0JvYw790MZp2WX/Z8FirG58A7p5Vn+KFucXa3w=";
    };
  }.${stdenv.system} or (throw "Unsupported system: ${stdenv.system}");

  meta = with lib; {
    description = "Free and Open Source messaging and emailing app that combines common web applications into one.";
    homepage = "https://github.com/TheGoddessInari/hamsket";
    license = licenses.gpl3;
    maintainers = with maintainers; [];
    platforms = [ "x86_64-linux" ];
    hydraPlatforms = [];
  };
}
