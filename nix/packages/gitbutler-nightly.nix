{
  lib,
  stdenv,
  fetchurl,
  autoPatchelfHook,
  zlib,
}:

let
  pin = lib.importJSON ./gitbutler-nightly.json;
  system = stdenv.hostPlatform.system;
  source = pin.sources.${system} or (throw "gitbutler-nightly: no pinned build for ${system}");
  appName = "GitButler Nightly.app";
in
stdenv.mkDerivation {
  pname = "gitbutler-nightly";
  inherit (pin) version;

  src = fetchurl { inherit (source) url hash; };

  sourceRoot = ".";
  dontUnpack = stdenv.hostPlatform.isLinux;
  dontFixup = stdenv.hostPlatform.isDarwin;

  nativeBuildInputs = lib.optionals stdenv.hostPlatform.isLinux [ autoPatchelfHook ];
  buildInputs = lib.optionals stdenv.hostPlatform.isLinux [
    zlib
    stdenv.cc.cc.lib
  ];

  installPhase =
    if stdenv.hostPlatform.isDarwin then
      ''
        runHook preInstall
        mkdir -p $out/Applications $out/bin
        cp -R "${appName}" $out/Applications/
        ln -s "$out/Applications/${appName}/Contents/MacOS/gitbutler-tauri" $out/bin/but
        runHook postInstall
      ''
    else
      ''
        runHook preInstall
        install -Dm755 $src $out/bin/but
        runHook postInstall
      '';

  meta = {
    description = "GitButler nightly build: the but CLI, plus the desktop app on macOS";
    homepage = "https://gitbutler.com";
    license = lib.licenses.unfree;
    mainProgram = "but";
    platforms = builtins.attrNames pin.sources;
    sourceProvenance = [ lib.sourceTypes.binaryNativeCode ];
  };
}
