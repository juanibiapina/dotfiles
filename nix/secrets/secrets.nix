let
  keys = import ../modules/ssh-keys.nix;

  systems = builtins.attrValues keys.systems;
  users = keys.userList;

  all = systems ++ users;

  # adb identity: only mini (headless target) and macm1 (source of the key)
  # need to decrypt it.
  adbHosts = [
    keys.systems.mini
    keys.systems.macm1
    keys.users.mini
    keys.users.macm1
  ];
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
  "adbkey.age".publicKeys = adbHosts;
  "adbkey-pub.age".publicKeys = adbHosts;
}
