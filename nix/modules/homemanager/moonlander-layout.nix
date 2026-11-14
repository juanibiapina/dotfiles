{ config, inputs, lib, pkgs, ... }:

let
  keymap = inputs.self.packages.${pkgs.stdenv.hostPlatform.system}.moonlander-keymap;
  directory = "${config.xdg.dataHome}/moonlander";
  target = "${directory}/moonlander.html";
in
{
  # Copy the Moonlander layout editor to a fixed path for a browser bookmark.
  # A copy, because Firefox follows a symlink to its /nix/store target, and
  # that path changes on every build.
  home.activation.moonlanderLayout = lib.hm.dag.entryAfter [ "linkGeneration" ] ''
    run mkdir -p ${directory}
    run rm -f ${target} ${directory}/moonlander.svg
    run install -m 644 ${keymap}/moonlander.html ${target}
  '';
}
