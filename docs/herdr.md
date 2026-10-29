# Herdr

The Herdr app on the Macs opens spaces on `mini` through herdr-core (`hc`) over ssh.

## herdr-core on mini

`hc` owns its binary in `~/.local/bin/herdr-core` on mini, as the Herdr app does on the Macs, so Nix does not install it. Run these commands on a Mac:

```bash
hc machine add mini --install   # copy the binary to mini
hc machine update mini          # update it
```

The `herdr-core` user unit (`nix/hosts/mini/modules/herdr-core.nix`) starts the server through a login zsh, so terminals get the login environment. `KillMode=process` keeps the core and its terminals running when the unit restarts or stops.

```bash
systemctl --user status herdr-core
hc server status
hc machine ls        # on a Mac
```

## Herdr app configuration on the Macs

The `herdr-app` Stow package links the configuration into `~/.config/herdr-app`. Herdr does not draw SVG icons that are symlinks, so `scripts/link-dotfiles.bash` copies the icons instead.

The file watcher of Herdr ignores edits to symlinked files. Its fallback check applies settings, keys, and layouts within about 10 s, but it never reloads a running mod. After you edit a mod, touch the link to send the watcher an event:

```bash
touch -h ~/.config/herdr-app/mods/<name>/main.js
```

`ctrl-space` opens the `prefix` mod, which waits for one key and runs its action. Prefix keys live in the `BINDINGS` table at the top of `mods/prefix/main.js`, not in `keys.json`.
