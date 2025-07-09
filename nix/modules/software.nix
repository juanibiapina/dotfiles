{ lib, ... }:

let
  folder = ./software;
  toImport = name: value: folder + ("/" + name);
  filterModules = key: value: value == "regular" && lib.hasSuffix ".nix" key;
  imports = lib.mapAttrsToList toImport (lib.filterAttrs filterModules (builtins.readDir folder));
in {
  inherit imports;
}