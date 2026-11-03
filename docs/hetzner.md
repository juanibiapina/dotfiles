# hetzner

`hetzner` is a Hetzner Cloud server (type `cx33`, location `fsn1`) in the Hetzner project `hetzner`. It runs Claudia, the bot in `juanibiapina/minecraft`. Every host has `hcloud` with the project's API token (`nix/modules/homemanager/hcloud.nix`).

## Access

`ssh hetzner` over Tailscale. The public address also accepts the user keys from `nix/modules/ssh-keys.nix`, for `juan` and `root`. VNC to the headless Chromium (port 5900) is reachable only over Tailscale.

## Apply changes

On the server, run `gob run make` in `~/workspace/juanibiapina/dotfiles`. The server has no automatic upgrades.

## Reinstall

This erases the disk. Run it from mini, which builds x86_64 locally, with a clean dotfiles clone:

```bash
nix run github:nix-community/nixos-anywhere -- --flake .#hetzner \
  --generate-hardware-config nixos-generate-config nix/hosts/hetzner/hardware-configuration.nix \
  --target-host root@"$(hcloud server ip hetzner)"
```

Then, on the server:

1. Run `sudo tailscale up` and disable key expiry for the machine in the Tailscale admin console.
2. Clone dotfiles to `~/workspace/juanibiapina/dotfiles` and unlock git-crypt as in [new-mac.md](new-mac.md).
3. Replace `/etc/nixos` with a link to the clone, as on mini, so `nixos-rebuild` finds the flake: `sudo rmdir /etc/nixos && sudo ln -s ~/workspace/juanibiapina/dotfiles /etc/nixos`.
4. Run `scripts/link-dotfiles.bash`, then `gob run make` from a new login shell.
5. Log in to `gh` and to pi.

## Delete

`hcloud server delete hetzner` deletes the server and stops billing.
