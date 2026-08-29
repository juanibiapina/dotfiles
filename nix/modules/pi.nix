{ pkgs, lib, ... }:

let
  # On darwin the user-facing `pi` is a disclaim launcher (see pi/pi-launcher.c),
  # and the node wrapper is exposed as `pi-real` for the launcher to exec. On
  # other platforms the node wrapper is the `pi` command directly.
  realBin = if pkgs.stdenv.isDarwin then "pi-real" else "pi";

  piReal = pkgs.buildNpmPackage rec {
    pname = "pi";
    version = "0.81.1";

    src = pkgs.fetchurl {
      url = "https://registry.npmjs.org/@earendil-works/pi-coding-agent/-/pi-coding-agent-${version}.tgz";
      hash = "sha512-r6ovAsZOgAqbC/aU6s+/dPnv/sGZBuWyZNvi3pXjpbuX5wvp3XvGkQI7/VLvX2o9XpmpFaPUxKNym1WfkN/P8A==";
    };

    npmDepsHash = "sha256-Tx91WRHBeQ9jCNWtzAYYhDOvvyRiwvqZjRJK4czGpFc=";

    postPatch = ''
      substituteInPlace package.json \
        --replace-fail '"devDependencies": {
		"@types/cross-spawn": "6.0.6",
		"@types/diff": "7.0.2",
		"@types/hosted-git-info": "3.0.5",
		"@types/ms": "2.1.0",
		"@types/node": "24.12.4",
		"@types/proper-lockfile": "4.1.4",
		"@types/semver": "7.7.1",
		"shx": "0.4.0",
		"typescript": "5.9.3",
		"vitest": "4.1.9"
	},' '"devDependencies": {},'

      substituteInPlace npm-shrinkwrap.json \
        --replace-fail '"resolved": "https://registry.npmjs.org/@earendil-works/pi-agent-core/-/pi-agent-core-0.81.1.tgz",' '"resolved": "https://registry.npmjs.org/@earendil-works/pi-agent-core/-/pi-agent-core-0.81.1.tgz", "integrity": "sha512-yqbh68CyhqxMov/jUogFJfMqlu2Gd37GAki+tr59YCmAPHfomiCA5ESzusXtpGzABeiZFC/OrRdQ4GwCCOMIHA==",' \
        --replace-fail '"resolved": "https://registry.npmjs.org/@earendil-works/pi-ai/-/pi-ai-0.81.1.tgz",' '"resolved": "https://registry.npmjs.org/@earendil-works/pi-ai/-/pi-ai-0.81.1.tgz", "integrity": "sha512-hzHE7Z8l5mgJk+ke67Lge0rwS2+wbKJrFKl9o5M1R1rh33+cCT7D1AHz1OAtX5wFs90E1/BTGhyJRTUHaMxGvQ==",' \
        --replace-fail '"resolved": "https://registry.npmjs.org/@earendil-works/pi-tui/-/pi-tui-0.81.1.tgz",' '"resolved": "https://registry.npmjs.org/@earendil-works/pi-tui/-/pi-tui-0.81.1.tgz", "integrity": "sha512-OMEe+Zt8oQYi/rCq3upxsTlIScWL0FPhXwQus34TbQb3EmTx88S7Uzx32JxvQiEeWOw8eDCdJf2PBUBE9r6wIg==",'
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
