{ config, inputs, lib, pkgs, ... }:

let
  keymap = inputs.self.packages.${pkgs.stdenv.hostPlatform.system}.moonlander-keymap;
  target = "${config.xdg.dataHome}/moonlander/moonlander.svg";
in
{
  # Copy the Moonlander layout drawing to a fixed path for a browser bookmark.
  # A copy, because Firefox follows a symlink to its /nix/store target, and
  # that path changes on every build.
  home.activation.moonlanderLayout = lib.hm.dag.entryAfter [ "linkGeneration" ] ''
    run mkdir -p "$(dirname ${target})"
    run rm -f ${target}
    run install -m 644 ${keymap}/moonlander.svg ${target}
  '';
}
