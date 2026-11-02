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

The `juan` layout's sidebar shows two copies of the `workbench` mod. The one with `part: "sessions"` lists every space with its agents; a space on another machine shows the machine's name at the right of its row. The other draws the focused session's context from `starmux snapshot`, run on the active space's machine; a machine without a starmux that has `snapshot` leaves it empty.

`ctrl-space o` opens the notes space, like `dev notes` in tmux: the `notes` mod goes there, or back to the previous space when already there, and makes it in `~/Sync/notes` with an editor tab and a pi tab the first time. The space's id is in `shared("notes.space")`. The `switch` picker leaves it out of its list; the Sessions list in `workbench` shows it like any other space. `space.next`, `space.prev`, and `ctrl-1` to `ctrl-9` still count it.

The tab bar (`tabs-juan`) shows one dot at its right end, like the `●` in the tmux status bar, while any agent in any space is blocked or finished unseen. Clicking it shows that agent, blocked ones first.
