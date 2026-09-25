{ pkgs, lib, ... }:

let
  # On darwin the user-facing `pi` is a disclaim launcher (see pi/pi-launcher.c),
  # and the node wrapper is exposed as `pi-real` for the launcher to exec. On
  # other platforms the node wrapper is the `pi` command directly.
  realBin = if pkgs.stdenv.isDarwin then "pi-real" else "pi";

  piReal = pkgs.buildNpmPackage rec {
    pname = "pi";
    version = "0.87.1";

    src = pkgs.fetchurl {
      url = "https://registry.npmjs.org/@earendil-works/pi-coding-agent/-/pi-coding-agent-${version}.tgz";
      hash = "sha512-m8ArJUtVcQMSe1lLE/Ei7vX/JV7O39sWmWBsXV2NOU70F0qCp8GubA24pT3LnwTmM6LL2xV80/h6sQg85n69ew==";
    };

    npmDepsHash = "sha256-RAXZefVqStuDdBnpYASwmLlKTua55LwisFZmN81KE14=";

    postPatch = ''
      ${pkgs.nodejs}/bin/node -e '
        const fs = require("node:fs");
        const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
        delete pkg.devDependencies;
        fs.writeFileSync("package.json", JSON.stringify(pkg));
      '

      substituteInPlace npm-shrinkwrap.json \
        --replace-fail '"resolved": "https://registry.npmjs.org/@earendil-works/chord/-/chord-0.87.1.tgz",' '"resolved": "https://registry.npmjs.org/@earendil-works/chord/-/chord-0.87.1.tgz", "integrity": "sha512-bg7IkJGFcEaMqqYgOGUiq5Ky9RghpRfrlZ8I/v/1b4bBZ02A7t3E+6uhPRbadwWb/kWsnVFbZsqOKRN4a3LLCg==",' \
        --replace-fail '"resolved": "https://registry.npmjs.org/@earendil-works/pi-agent-core/-/pi-agent-core-0.87.1.tgz",' '"resolved": "https://registry.npmjs.org/@earendil-works/pi-agent-core/-/pi-agent-core-0.87.1.tgz", "integrity": "sha512-Zev3B0HK7YS5A4EZQ2XnEqiJuirx6QBiltJ+LpmjV5a/+2IU0cfKtIfnkNkORK707XOvKBY2WRtk7cAwHpbh2Q==",' \
        --replace-fail '"resolved": "https://registry.npmjs.org/@earendil-works/pi-ai/-/pi-ai-0.87.1.tgz",' '"resolved": "https://registry.npmjs.org/@earendil-works/pi-ai/-/pi-ai-0.87.1.tgz", "integrity": "sha512-X/3PfQBnnoeVdO9Cv8zHghUMglzlgNZYGNzoPnbRoGnHl3Rw3TlA2UKSUB7BRHUOxMryHXYa8dnjWZlbRheDZA==",' \
        --replace-fail '"resolved": "https://registry.npmjs.org/@earendil-works/pi-telemetry/-/pi-telemetry-0.87.1.tgz",' '"resolved": "https://registry.npmjs.org/@earendil-works/pi-telemetry/-/pi-telemetry-0.87.1.tgz", "integrity": "sha512-MC6TRQH5lgMXpcN+Vku2WMI2T8BsiUPzMQHGo81uqFZD3/9O79WWJAysEDGuzduP6R4tvtgwMLwmqIxynM10JQ==",' \
        --replace-fail '"resolved": "https://registry.npmjs.org/@earendil-works/pi-tui/-/pi-tui-0.87.1.tgz",' '"resolved": "https://registry.npmjs.org/@earendil-works/pi-tui/-/pi-tui-0.87.1.tgz", "integrity": "sha512-YEH2vRyOeiO7hhN6j6AE6YwKSq2Kz2f3XR8bj1TbR+aGE/JsnY1hLPMI2pvaZfRM1n9Y00tejxFQ4zbzvF7nkQ==",'
    '';

    dontNpmBuild = true;
    npmInstallFlags = [ "--omit=dev" ];

    installPhase = ''
      runHook preInstall

      mkdir -p $out/lib/pi
      cp -r dist docs examples node_modules package.json README.md CHANGELOG.md $out/lib/pi/

      mkdir -p $out/bin
      makeWrapper ${pkgs.nodejs}/bin/node $out/bin/${realBin} \
        --add-flags "$out/lib/pi/dist/bundle/cli.js" \
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
