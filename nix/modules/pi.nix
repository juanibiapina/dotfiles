{ pkgs, inputs, lib, ... }:

let
  realBin = if pkgs.stdenv.hostPlatform.isDarwin then "pi-real" else "pi";
  nodejs = pkgs.nodejs;
  version = (lib.importJSON "${inputs.pi}/packages/coding-agent/package.json").version;
  aiVersion = (lib.importJSON "${inputs.pi}/packages/ai/package.json").version;
  aiMetadata = lib.importJSON inputs.pi-ai-metadata;
  aiRelease = aiMetadata.versions.${aiVersion}.dist or
    (throw "Pi model data for ${aiVersion} is unavailable; update the pi-ai-metadata flake input or select a released Pi revision.");
  modelData = pkgs.fetchurl {
    url = aiRelease.tarball;
    hash = aiRelease.integrity;
  };
  importedDeps = pkgs.importNpmLock { npmRoot = inputs.pi; };

  # importNpmLock rewrites workspace links to unbuilt source store paths.
  npmDeps = pkgs.runCommand "pi-workspace-dependencies" {
    nativeBuildInputs = [ pkgs.jq ];
  } ''
    mkdir -p $out
    cp ${importedDeps}/package.json $out/package.json
    jq --slurpfile original ${inputs.pi}/package-lock.json '
      .packages += ($original[0].packages | with_entries(select(.value.link == true)))
    ' ${importedDeps}/package-lock.json > $out/package-lock.json
  '';

  piReal = pkgs.buildNpmPackage {
    pname = "pi";
    inherit version;
    src = inputs.pi;

    postPatch = ''
      mkdir -p packages/ai/src/providers/data
      tar -xzf ${modelData} --strip-components=4 \
        -C packages/ai/src/providers/data package/dist/providers/data
    '';

    inherit nodejs npmDeps;
    npmConfigHook = pkgs.importNpmLock.npmConfigHook;
    npmRebuildFlags = [ "--ignore-scripts" ];
    npmBuildScript = "build:offline";

    installPhase = ''
      runHook preInstall

      # Example workspaces bring optional sandbox dependencies into the closure.
      ${nodejs}/bin/node -e '
        const fs = require("node:fs");
        const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
        pkg.workspaces = pkg.workspaces.filter(path => !path.includes("/examples/"));
        fs.writeFileSync("package.json", JSON.stringify(pkg));
      '
      npm prune --omit=dev --ignore-scripts --offline

      mkdir -p $out/lib/pi $out/bin
      cp -r node_modules packages $out/lib/pi/
      cp package.json $out/lib/pi/
      # Compiled installations resolve assets beneath dist, not src.
      rm -rf $out/lib/pi/packages/coding-agent/src

      makeWrapper ${nodejs}/bin/node $out/bin/${realBin} \
        --add-flags "$out/lib/pi/packages/coding-agent/dist/bundle/cli.js" \
        --prefix PATH : ${lib.makeBinPath [ pkgs.ripgrep pkgs.fd ]}

      runHook postInstall
    '';

    nativeBuildInputs = [ pkgs.makeWrapper ]
      ++ lib.optionals pkgs.stdenv.hostPlatform.isLinux [ pkgs.autoPatchelfHook ];
    buildInputs = lib.optionals pkgs.stdenv.hostPlatform.isLinux [
      pkgs.libxcb
      pkgs.stdenv.cc.cc.lib
    ];

    # Patch native dependency tools before the TypeScript/esbuild compilation.
    preBuild = lib.optionalString pkgs.stdenv.hostPlatform.isLinux ''
      autoPatchelf node_modules/@typescript node_modules/@esbuild
    '';

    meta = with lib; {
      description = "Pi coding agent";
      homepage = "https://github.com/earendil-works/pi";
      license = licenses.mit;
      platforms = [ "aarch64-darwin" "x86_64-linux" ];
      mainProgram = realBin;
    };
  };

  # TCC grants belong to this stable launcher, independently of Pi upgrades.
  piLauncher = pkgs.runCommandCC "pi-launcher" { } ''
    mkdir -p $out/bin
    $CC -O2 -Wall -Wextra -o $out/bin/pi ${./pi/pi-launcher.c}
  '';

  piCommand = (if pkgs.stdenv.hostPlatform.isDarwin then piLauncher else piReal).overrideAttrs (old: {
    passthru = (old.passthru or { }) // { realPackage = piReal; };
  });
in
{
  options.packages.pi = lib.mkOption {
    type = lib.types.package;
    default = piCommand;
    readOnly = true;
    description = "The pi package";
  };

  config.environment.systemPackages =
    [ piReal ] ++ lib.optional pkgs.stdenv.hostPlatform.isDarwin piCommand;
}
