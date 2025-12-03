# Managing Secrets with agenix

This document describes how to create and manage secrets using agenix.

## How to create a new secret

### 1. Add entry to `nix/secrets/secrets.nix`

```nix
"secret-name.age".publicKeys = all;
```

### 2. Encrypt the secret file

```bash
cd nix/secrets
agenix -e secret-name.age
# Editor will open - paste/type the secret content, save and exit
```

> [!INFO]
> This step must be done by the user. AI Agents will fail to create the file.

### 3. Use the secret

```nix
age.secrets.secret-name = {
  file = ../../secrets/secret-name.age;
};

# Then reference it via: config.age.secrets.secret-name.path
