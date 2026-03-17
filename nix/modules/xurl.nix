{ pkgs, ... }:

let
  xurl = pkgs.stdenv.mkDerivation {
    pname = "xurl";
    version = "1.0.3";

    src = pkgs.fetchurl {
      url = "https://github.com/xdevplatform/xurl/releases/download/v1.0.3/xurl_Linux_x86_64.tar.gz";
      sha256 = "sha256-NLxnv7rymuEh93iPvSSR06i5XLOUczOtOXMuaUSXwYI=";
    };

    sourceRoot = ".";

    nativeBuildInputs = [ pkgs.autoPatchelfHook ];

    installPhase = ''
      install -Dm755 xurl $out/bin/xurl
    '';

    meta = with pkgs.lib; {
      description = "Official X/Twitter CLI";
      homepage = "https://github.com/xdevplatform/xurl";
      license = licenses.mit;
      platforms = [ "x86_64-linux" ];
    };
  };
in
{
  environment.systemPackages = [ xurl ];
}
