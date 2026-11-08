{ pkgs, qmkSrc, keymap }:

pkgs.stdenv.mkDerivation {
  pname = "moonlander-firmware";
  version = "firmware25";

  src = qmkSrc;

  nativeBuildInputs = [ pkgs.qmk ];

  dontConfigure = true;
  dontFixup = true;

  buildPhase = ''
    runHook preBuild

    export HOME="$TMPDIR"
    export QMK_HOME="$PWD"

    mkdir -p keyboards/zsa/moonlander/keymaps/juan
    cp ${keymap}/* keyboards/zsa/moonlander/keymaps/juan/

    mkdir -p "$TMPDIR/userspace"
    make zsa/moonlander/reva:juan SKIP_GIT=yes QMK_USERSPACE="$TMPDIR/userspace"

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall
    mkdir -p $out
    cp zsa_moonlander_reva_juan.bin $out/
    runHook postInstall
  '';
}
