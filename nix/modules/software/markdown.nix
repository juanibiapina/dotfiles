{ config, lib, ... }:

with lib;

let
  cfg = config.modules.markdown;
in
{
  options.modules.markdown = {
    enable = mkEnableOption "Markdown development environment";
  };

  config = mkIf cfg.enable {
    homebrew = {
      enable = true;

      brews = [
        "markdown-oxide" # markdown language server
      ];
    };
  };
}
