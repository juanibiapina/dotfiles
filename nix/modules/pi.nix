{ pkgs, inputs, lib, ... }:

let
  pi = pkgs.buildNpmPackage {
    pname = "pi";
    version = "0.80.3";

    src = inputs.pi;

    npmDepsHash = "sha256-geh8LH88OZybFXkR/jDeTdew6TNMdFM6jhCSYKn//dU=";

    # The ai package build script runs generate-models and generate-image-models
    # which require network access. The generated files are already committed to
    # the repo, so we strip those commands.
    postPatch = ''
      substituteInPlace packages/ai/package.json \
        --replace-fail \
          '"build": "npm run generate-models && npm run generate-image-models && tsgo -p tsconfig.build.json"' \
          '"build": "tsgo -p tsconfig.build.json"'
    '';

    npmBuildScript = "build";

    # Don't run the default install phase (no bin in root package.json)
    dontNpmInstall = true;

    installPhase = ''
      runHook preInstall

      mkdir -p $out/lib/pi
      cp -r packages $out/lib/pi/
      cp -r node_modules $out/lib/pi/
      cp package.json $out/lib/pi/

      mkdir -p $out/bin
      makeWrapper ${pkgs.nodejs}/bin/node $out/bin/pi \
        --add-flags "$out/lib/pi/packages/coding-agent/dist/cli.js" \
        --prefix PATH : ${lib.makeBinPath [ pkgs.ripgrep pkgs.fd ]}

      runHook postInstall
    '';

    nativeBuildInputs = [
      pkgs.makeWrapper
      pkgs.pkg-config
      pkgs.python3 # needed by node-gyp
    ];

    buildInputs = [
      pkgs.pixman
      pkgs.cairo
      pkgs.pango
      pkgs.libjpeg
      pkgs.giflib
      pkgs.librsvg
    ];

    meta = with pkgs.lib; {
      description = "Pi coding agent";
      homepage = "https://github.com/earendil-works/pi";
      license = licenses.asl20;
      platforms = platforms.all;
    };
  };
in
{
  options.packages.pi = lib.mkOption {
    type = lib.types.package;
    default = pi;
    readOnly = true;
    description = "The pi package";
  };

  config.environment.systemPackages = [ pi ];
}
