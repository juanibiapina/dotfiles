{ pkgs, lib, ... }:

let
  # On darwin the user-facing `pi` is a disclaim launcher (see pi/pi-launcher.c),
  # and the node wrapper is exposed as `pi-real` for the launcher to exec. On
  # other platforms the node wrapper is the `pi` command directly.
  realBin = if pkgs.stdenv.isDarwin then "pi-real" else "pi";

  piReal = pkgs.buildNpmPackage rec {
    pname = "pi";
    version = "0.84.4";

    src = pkgs.fetchurl {
      url = "https://registry.npmjs.org/@earendil-works/pi-coding-agent/-/pi-coding-agent-${version}.tgz";
      hash = "sha512-jmOlrqUmvhh/siNWFRXjYLJzhKFIHNsAQaysRwzQPQFnPAaV/vhqHsLH/MBsIISA1Rjj7WTUFR3nJrpXoLx39w==";
    };

    npmDepsHash = "sha256-bXDIyivmtR2HFcNiUsGhj64rfChJ79UbeeIeJhEea3E=";

    postPatch = ''
      substituteInPlace package.json \
        --replace-fail '"devDependencies": {
		"@types/cross-spawn": "6.0.6",
		"@types/hosted-git-info": "3.0.5",
		"@types/node": "22.19.19",
		"@types/proper-lockfile": "4.1.4",
		"@types/semver": "7.7.1",
		"shx": "0.4.0",
		"typescript": "5.9.3",
		"vitest": "4.1.9"
	},' '"devDependencies": {},'

      substituteInPlace npm-shrinkwrap.json \
        --replace-fail '"resolved": "https://registry.npmjs.org/@earendil-works/pi-agent-core/-/pi-agent-core-0.84.4.tgz",' '"resolved": "https://registry.npmjs.org/@earendil-works/pi-agent-core/-/pi-agent-core-0.84.4.tgz", "integrity": "sha512-HyUnjaOXj6oN/6SNcr8A1J/ElRQA50FtIE0XUTSKAQVqmdlb9qdojOyUQwF/jULE5+yOEtGuVgi/N1RnBiNG+g==",' \
        --replace-fail '"resolved": "https://registry.npmjs.org/@earendil-works/pi-ai/-/pi-ai-0.84.4.tgz",' '"resolved": "https://registry.npmjs.org/@earendil-works/pi-ai/-/pi-ai-0.84.4.tgz", "integrity": "sha512-AClAZxf5+c4RRu44NJPS6wyQy+Nmq+Mzyyrdvm4ZVMNuixelO02RZX4G4Aq1F145Yzp43wnM5S+hLlSI7ypfVw==",' \
        --replace-fail '"resolved": "https://registry.npmjs.org/@earendil-works/pi-client/-/pi-client-0.84.4.tgz",' '"resolved": "https://registry.npmjs.org/@earendil-works/pi-client/-/pi-client-0.84.4.tgz", "integrity": "sha512-q398WY/3ZQHTizk7IKxApzqFV0xt4yM9LkSkwyqeLK5Bj5RwRjOWxESt26z4LgNp4O+8hqhqFPf/8fj4H5rE4A==",' \
        --replace-fail '"resolved": "https://registry.npmjs.org/@earendil-works/pi-protocol/-/pi-protocol-0.84.4.tgz",' '"resolved": "https://registry.npmjs.org/@earendil-works/pi-protocol/-/pi-protocol-0.84.4.tgz", "integrity": "sha512-acyE9ozxkMiWiz/xyWpU0O9vwnYv0hyG889Vniv6Sg9c9zfsX+8MePnDNphBacY2Fvm1rxdsGmiVDSZl9yuDFA==",' \
        --replace-fail '"resolved": "https://registry.npmjs.org/@earendil-works/pi-telemetry/-/pi-telemetry-0.84.4.tgz",' '"resolved": "https://registry.npmjs.org/@earendil-works/pi-telemetry/-/pi-telemetry-0.84.4.tgz", "integrity": "sha512-8e2CuxM+ht+hedQXTZmi5JVl6/xDK9RpSDL2+MbITevKYQhMZ/z6lJOTFgox3HQyGxO8mOZEtYGVeQNaD4OzqA==",' \
        --replace-fail '"resolved": "https://registry.npmjs.org/@earendil-works/pi-tui/-/pi-tui-0.84.4.tgz",' '"resolved": "https://registry.npmjs.org/@earendil-works/pi-tui/-/pi-tui-0.84.4.tgz", "integrity": "sha512-nPUnwDkLtupPXnZQYrCwPFcuTydCDqTY6ZbFqhsL4S4kVq0AT418kPa/6uXwtaCD+MjBNBltb7ScTYX65yeE1w==",'
    '';

    dontNpmBuild = true;
    npmInstallFlags = [ "--omit=dev" ];

    installPhase = ''
      runHook preInstall

      mkdir -p $out/lib/pi
      cp -r dist docs examples node_modules package.json README.md CHANGELOG.md $out/lib/pi/

      mkdir -p $out/bin
      makeWrapper ${pkgs.nodejs}/bin/node $out/bin/${realBin} \
        --add-flags "$out/lib/pi/dist/cli.js" \
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
      license = licenses.mit;
      platforms = platforms.all;
    };
  };

  # Small native launcher that disclaims TCC responsibility onto itself, then
  # execs pi-real. Grant this binary Full Disk Access once; the grant survives
  # pi upgrades because this derivation does not depend on pi's version.
  piLauncher = pkgs.runCommandCC "pi-launcher" { } ''
    mkdir -p $out/bin
    $CC -O2 -Wall -Wextra -o $out/bin/pi ${./pi/pi-launcher.c}
  '';

  # User-facing `pi`: the launcher on darwin, the node wrapper elsewhere.
  piCommand = if pkgs.stdenv.isDarwin then piLauncher else piReal;
in
{
  options.packages.pi = lib.mkOption {
    type = lib.types.package;
    default = piCommand;
    readOnly = true;
    description = "The pi package";
  };

  config.environment.systemPackages =
    [ piReal ] ++ lib.optional pkgs.stdenv.isDarwin piLauncher;
}
