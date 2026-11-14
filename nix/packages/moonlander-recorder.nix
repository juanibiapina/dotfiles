{ pkgs }:

pkgs.writers.writePython3Bin "moonlander-recorder" { flakeIgnore = [ "E501" ]; }
  (builtins.replaceStrings
    [ "@libhidapi@" ]
    [ "${pkgs.hidapi}/lib/libhidapi${pkgs.stdenv.hostPlatform.extensions.sharedLibrary}" ]
    (builtins.readFile ../../keyboards/moonlander/usage/recorder.py))
