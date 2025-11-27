{ config, lib, pkgs, ... }:

{
  home.file."workspace/mise.toml".text = ''
    [tools]
    node = "latest"
  '';
}
