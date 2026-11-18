{ config, lib, ... }:

let
  secret = ../../secrets/linear-api-key.age;
in
{
  config = lib.mkIf (builtins.pathExists secret) {
    age.secrets.linear-api-key = {
      file = secret;
      path = "${config.xdg.configHome}/linear/api-key";
      mode = "600";
      symlink = false;
    };
  };
}
