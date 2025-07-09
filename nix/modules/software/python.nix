{ config, lib, isDarwin, ... }:

with lib;

let
  cfg = config.modules.python;
in
{
  options.modules.python = {
    enable = mkEnableOption "Python development environment";
  };

  config = mkIf cfg.enable (
    lib.optionalAttrs isDarwin {
      homebrew = {
        enable = true;

        brews = [
          "uv"
        ];
      };
    }
  );
}
