let
  keys = import ../modules/ssh-keys.nix;

  # Personal hosts can decrypt every personal secret. The work host (mb5p) is
  # left out on purpose and only receives its own secrets.
  personal = [
    keys.systems.mini
    keys.systems.macm1
    keys.users.mini
    keys.users.macm1
  ];

  # mb5p keys exist only after its first build; until then its secrets are
  # encrypted for the personal hosts alone (rekey with `agenix -r` afterwards).
  mb5p = builtins.filter (k: k != null) [
    (keys.systems.mb5p or null)
    (keys.users.mb5p or null)
  ];

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
  "grafana-admin-password.age".publicKeys = personal;
  "grafana-secret-key.age".publicKeys = personal;
  "macm1-syncthing-cert.age".publicKeys = personal;
  "macm1-syncthing-key.age".publicKeys = personal;
  "mb5p-syncthing-cert.age".publicKeys = personal ++ mb5p;
  "mb5p-syncthing-key.age".publicKeys = personal ++ mb5p;
  "google-credentials.age".publicKeys = personal;
  "gog-keyring-password.age".publicKeys = personal;
  "cloudflare-ddns-token.age".publicKeys = personal;
  "passwords-webdav-env.age".publicKeys = personal;
  "adbkey.age".publicKeys = adbHosts;
  "adbkey-pub.age".publicKeys = adbHosts;
}
