{ config, lib, ... }:

with lib;

let
  cfg = config.modules.lua;
in
{
  options.modules.lua = {
    enable = mkEnableOption "Lua development environment";
  };

  config = mkIf cfg.enable {
    homebrew = {
      enable = true;

      brews = [
        "lua-language-server" # language server
        "luarocks" # package manager
        "stylua" # formatter
      ];
    };
  };
}
