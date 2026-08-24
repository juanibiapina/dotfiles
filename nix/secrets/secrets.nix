let
  keys = import ../modules/ssh-keys.nix;

  systems = builtins.attrValues keys.systems;
  users = keys.userList;

  all = systems ++ users;
in
{
  "grafana-admin-password.age".publicKeys = all;
  "grafana-secret-key.age".publicKeys = all;
  "macm1-syncthing-cert.age".publicKeys = all;
  "macm1-syncthing-key.age".publicKeys = all;
  "macr-syncthing-cert.age".publicKeys = all;
  "macr-syncthing-key.age".publicKeys = all;
  "google-credentials.age".publicKeys = all;
  "xurl-config.age".publicKeys = all;
  "cloudflare-ddns-token.age".publicKeys = all;
  "cloudflared-deltoids.age".publicKeys = all;
  "ntfy-topic.age".publicKeys = all;
}
