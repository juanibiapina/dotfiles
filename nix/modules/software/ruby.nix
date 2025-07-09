{ config, lib, ... }:

with lib;

let
  cfg = config.modules.ruby;
in
{
  options.modules.ruby = {
    enable = mkEnableOption "Ruby development environment";
  };

  config = mkIf cfg.enable {
    homebrew = {
      brews = [
        # ruby-build dependencies
        # https://github.com/rbenv/ruby-build/wiki#suggested-build-environment
        "autoconf"
        "gmp"
        "libyaml"
        "openssl"
        "readline"

        "libpq" # PostgreSQL client libraries, for pg gem

        "mise" # version manager
      ];
    };
  };
}
