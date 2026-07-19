{ config, ... }:

let
  # UUID printed by `cloudflared tunnel create mini-deltoids`.
  # The matching credentials JSON is stored in agenix as
  # nix/secrets/cloudflared-deltoids.age.
  tunnelId = "dbb135da-7f50-483b-b2c9-8cd064612df5";
in
{
  # Outbound-only tunnel: cloudflared dials Cloudflare's edge, so no inbound
  # firewall port is opened. Access (Google login) gates the hostname at the
  # edge before traffic reaches deltoids serve on 127.0.0.1:8788.
  services.cloudflared = {
    enable = true;
    tunnels.${tunnelId} = {
      credentialsFile = config.age.secrets.cloudflared-deltoids.path;
      default = "http_status:404";
      ingress = {
        "deltoids.juanibiapina.dev" = "http://127.0.0.1:8788";
      };
    };
  };

  # Root-owned (agenix default 0400 root). Do NOT set owner/group: the
  # services.cloudflared module runs with DynamicUser = true and reads the
  # credentials via systemd LoadCredential as root before dropping privileges.
  age.secrets.cloudflared-deltoids.file = ../../../secrets/cloudflared-deltoids.age;
}
