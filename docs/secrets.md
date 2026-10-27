# Managing Secrets with agenix

This document describes how to create and manage secrets using agenix.

## Recipients

`nix/secrets/secrets.nix` lists the public keys that can decrypt each secret. The keys come from `nix/modules/ssh-keys.nix`. Each host has a user key and a system key there.

- `all`: the keys of every host. Most secrets use this list.
- `adbHosts`: the hosts that use the adb identity.

## How to create a new secret

### 1. Add entry to `nix/secrets/secrets.nix`

```nix
"secret-name.age".publicKeys = all;
```

### 2. Encrypt the secret file

```bash
cd nix/secrets
EDITOR='tee' agenix -e secret-name.age <<'EOF'
secret content here
EOF
```

### 3. Use the secret

```nix
age.secrets.secret-name = {
  file = ../../secrets/secret-name.age;
};

# Then reference it via: config.age.secrets.secret-name.path
```

## Add the keys of a host

1. Add the user key (`~/.ssh/id_ed25519.pub` of the host) under `users.<host>` in `nix/modules/ssh-keys.nix`. Every host adds the user keys to `authorized_keys`.
2. Add the system key (`/etc/ssh/ssh_host_ed25519_key.pub` of the host) under `systems.<host>`.
3. Add the keys to the recipient lists in `nix/secrets/secrets.nix` that the host needs.
4. Re-encrypt the affected files on a host that can decrypt them.

## Re-encrypt for new recipients

To re-encrypt every file, run `agenix -r` in `nix/secrets`. To re-encrypt one file, run this in `nix/secrets`:

```bash
secret_file=$(mktemp)
agenix -d secret-name.age > "$secret_file"
rm secret-name.age
EDITOR='tee' agenix -e secret-name.age < "$secret_file"
rm "$secret_file"
```
