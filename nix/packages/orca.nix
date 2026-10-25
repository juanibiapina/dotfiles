{ pkgs }:

# Orca (https://orca.dev), the agent workspace app from stablyai/orca.
# nixpkgs `orca` is the GNOME screen reader, so this package exposes the CLI as
# `orca-ide`, the same name the upstream Linux packages use.
#
# The app runs inside an FHS environment because `orca-ide serve` downloads a
# pinned Node runtime and other prebuilt helpers at run time, and those expect
# a regular Linux filesystem layout.
let
  version = "1.4.240";

  unpacked = pkgs.stdenvNoCC.mkDerivation {
    pname = "orca-ide-unpacked";
    inherit version;

    src = pkgs.fetchurl {
      url = "https://github.com/stablyai/orca/releases/download/v${version}/orca-ide_${version}_amd64.deb";
      hash = "sha256-T44pOhmQ1tc8HpuPq1EA1qM4MkfOCfsVLxTOWBdSZiM=";
    };

    nativeBuildInputs = [ pkgs.dpkg ];

    unpackPhase = ''
      dpkg-deb -x $src .
    '';

    installPhase = ''
      mkdir -p $out
      cp -r opt usr/share $out/
    '';

    dontFixup = true;
  };
in
pkgs.buildFHSEnv (
  pkgs.appimageTools.defaultFhsEnvArgs
  // {
    pname = "orca-ide";
    inherit version;

    runScript = "${unpacked}/opt/Orca/resources/bin/orca-ide";

    meta = {
      description = "Workspace for running a fleet of coding agents";
      homepage = "https://orca.dev";
      license = pkgs.lib.licenses.unfree;
      mainProgram = "orca-ide";
      platforms = [ "x86_64-linux" ];
      sourceProvenance = [ pkgs.lib.sourceTypes.binaryNativeCode ];
    };
  }
)
