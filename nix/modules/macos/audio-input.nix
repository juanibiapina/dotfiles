{ pkgs, lib, config, ... }:

let
  cfg = config.modules.system;
  pinBuiltinMic = pkgs.swiftPackages.stdenv.mkDerivation {
    name = "pin-builtin-mic";
    dontUnpack = true;
    nativeBuildInputs = [ pkgs.swift ];
    buildPhase = ''
      swiftc -O ${./pin-builtin-mic.swift} -o pin-builtin-mic
    '';
    installPhase = ''
      mkdir -p $out/bin
      cp pin-builtin-mic $out/bin/
    '';
  };
in
{
  system.activationScripts.postActivation.text = lib.mkAfter ''
    launchctl asuser "$(id -u ${cfg.username})" sudo -u ${cfg.username} \
      ${pinBuiltinMic}/bin/pin-builtin-mic || true
  '';
}
