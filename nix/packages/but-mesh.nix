{
  lib,
  stdenv,
  fetchurl,
}:

let
  pin = lib.importJSON ./but-mesh.json;
  system = stdenv.hostPlatform.system;
  source = pin.sources.${system} or (throw "but-mesh: no pinned build for ${system}");
in
stdenv.mkDerivation {
  pname = "but-mesh";
  inherit (pin) version;

  src = fetchurl { inherit (source) url hash; };

  sourceRoot = ".";
  dontFixup = true;

  installPhase = ''
    runHook preInstall
    install -Dm755 but-mesh $out/bin/but-mesh
    runHook postInstall
  '';

  meta = {
    description = "GitButler mesh CLI and daemon, run as `but mesh`";
    homepage = "https://but.dev";
    license = lib.licenses.unfree;
    mainProgram = "but-mesh";
    platforms = builtins.attrNames pin.sources;
    sourceProvenance = [ lib.sourceTypes.binaryNativeCode ];
  };
}
