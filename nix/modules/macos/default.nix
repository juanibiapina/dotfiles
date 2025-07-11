{ lib, ... }:

let
  # Read all files in the current directory
  files = builtins.readDir ./.;

  # Filter to only include .nix files that are regular files, excluding default.nix
  moduleFiles = lib.filterAttrs (name: type:
    type == "regular" &&
    lib.hasSuffix ".nix" name &&
    name != "default.nix"
  ) files;

  # Convert filenames to import paths
  moduleImports = lib.mapAttrsToList (name: type: ./. + "/${name}") moduleFiles;
in
{
  imports = moduleImports;
}
