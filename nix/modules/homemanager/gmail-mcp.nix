{ config, lib, ... }:

{
  age.secrets.gcp-oauth-keys = {
    file = ../../secrets/gcp-oauth-keys.age;
  };

  home.activation.gmail-mcp-keys = lib.hm.dag.entryAfter ["writeBoundary"] ''
    run mkdir -p ~/.gmail-mcp
    run ln -sf ${config.age.secrets.gcp-oauth-keys.path} ~/.gmail-mcp/gcp-oauth.keys.json
  '';
}
