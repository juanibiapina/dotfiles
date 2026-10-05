{ pkgs, inputs, lib, ... }:

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
