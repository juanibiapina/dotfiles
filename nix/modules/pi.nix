{ pkgs, inputs, lib, config, ... }:

let
  # Upstream's wrapper puts its Node 22 first on PATH, which shadows the
  # mise node in every shell pi starts. Build from a patched source until
  # https://github.com/earendil-works/pi/issues/10519 is fixed.
  upstreamSrc = pkgs.applyPatches {
    name = "pi-source";
    src = inputs.pi;
    patches = [ ./pi/nix-node-path.patch ];
  };
  upstreamPi = pkgs.callPackage "${upstreamSrc}/nix/package.nix" { source = upstreamSrc; };
  piReal = if pkgs.stdenv.hostPlatform.isDarwin then
    pkgs.runCommand "pi-real-${upstreamPi.version}" {
      nativeBuildInputs = [ pkgs.makeWrapper ];
      meta.mainProgram = "pi-real";
    } ''
      mkdir -p $out/bin
      makeWrapper ${upstreamPi}/bin/pi $out/bin/pi-real
    ''
  else upstreamPi;

  # macOS privacy grants attach to an app's identity. A store path changes on
  # every rebuild, so activation installs a signed copy of this bundle at a
  # fixed path, and `pi` runs that copy.
  piApp = pkgs.runCommandCC "pi-app" { } ''
    mkdir -p $out/Pi.app/Contents/MacOS
    cp ${./pi/Info.plist} $out/Pi.app/Contents/Info.plist
    $CC -O2 -Wall -Wextra -o $out/Pi.app/Contents/MacOS/pi ${./pi/pi-launcher.c}
  '';

  installPiApp = pkgs.writeShellApplication {
    name = "install-pi-app";
    runtimeInputs = [ pkgs.openssl ];
    text = builtins.readFile ./pi/install-pi-app.sh;
  };

  piLauncher = pkgs.writeShellScriptBin "pi" ''
    app="$HOME/.local/share/pi-launcher/Pi.app/Contents/MacOS/pi"
    [ -x "$app" ] || app=${piApp}/Pi.app/Contents/MacOS/pi
    exec -a pi "$app" "$@"
  '';

  piCommand = (if pkgs.stdenv.hostPlatform.isDarwin then piLauncher else piReal).overrideAttrs (old: {
    passthru = (old.passthru or { }) // { realPackage = piReal; };
  });

  primaryUser = config.system.primaryUser;
in
{
  options.packages.pi = lib.mkOption {
    type = lib.types.package;
    default = piCommand;
    readOnly = true;
    description = "The pi package";
  };

  config = lib.mkMerge [
    {
      environment.systemPackages =
        [ piReal ] ++ lib.optional pkgs.stdenv.hostPlatform.isDarwin piCommand;
    }
    (lib.mkIf pkgs.stdenv.hostPlatform.isDarwin {
      system.activationScripts.postActivation.text = lib.mkAfter ''
        launchctl asuser "$(id -u ${primaryUser})" sudo -H -u ${primaryUser} \
          ${installPiApp}/bin/install-pi-app ${piApp}/Pi.app \
          || echo "pi: could not sign Pi.app; keeping the installed copy" >&2
      '';
    })
  ];
}
