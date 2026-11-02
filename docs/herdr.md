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

## Herdr app build on the Macs

The Macs run a Herdr app built from the checkout in `~/workspace/herdrdev/herdr-app`, with Juan's branches from the `fork` remote. A local build never updates itself, so update it by pulling and building again:

```bash
cd ~/workspace/herdrdev/herdr-app
mise install zig@0.16.0
ZIG="$(mise where zig@0.16.0)/zig" bash scripts/install-macos
```

The vendored Ghostty needs Zig 0.16; the newer Zig from Homebrew fails to build it. `scripts/install-macos` installs `~/Applications/Herdr.app` without stopping the running window; quit Herdr and open it again to use the new build. Keep no other copy in `/Applications`: Spotlight and the Dock may open the old one, and Herdr points `~/.local/bin/herdr-app` at whichever copy started last. `herdr-app --version` shows the version of the copy that started last.

## Herdr app configuration on the Macs

The `herdr-app` Stow package links the configuration into `~/.config/herdr-app`. Herdr does not draw SVG icons that are symlinks, so `scripts/link-dotfiles.bash` copies the icons instead.

The file watcher of Herdr ignores edits to symlinked files. Its fallback check applies settings, keys, and layouts within about 10 s, but it never reloads a running mod. After you edit a mod, touch the link to send the watcher an event:

```bash
touch -h ~/.config/herdr-app/mods/<name>/main.js
```

`ctrl-space` opens the `prefix` mod, which waits for one key and runs its action. Prefix keys live in the `BINDINGS` table at the top of `mods/prefix/main.js`, not in `keys.json`.

The `juan` layout's sidebar is one `workbench` block. Its Sessions list shows every space in alphabetical order, factory spaces last, with its agents, and `agent.next` and `agent.prev` follow that order, as do `ctrl-space (` and `ctrl-space )` (`tabs-juan.space-prev` and `space-next`); a space on another machine shows the machine's name at the right of its row, and a factory space (id `factory-<clone>`, from `dev factory pickup`) shows a `factory` tag. Below the list, it draws the focused session's context and jobs, then Git, System and Claude Plan at the bottom, all from `starmux snapshot`, run on the active space's machine; a machine without a starmux that has `snapshot` leaves them empty. The bottom part always shows in full. The list and the context take their own height and leave the spare room above the bottom part; when they don't fit, the list shrinks to 90 px and scrolls first.

`ctrl-space o` opens the notes space, like `dev notes` in tmux: the `notes` mod goes there, or back to the previous space when already there, and makes it in `~/Sync/notes` with an editor tab and a pi tab the first time. The space's id is in `shared("notes.space")`. The `switch` picker leaves it out of its list; the Sessions list in `workbench` shows it like any other space. `ctrl-space (` and `ctrl-space )` still count it.

The tab bar (`tabs-juan`) shows one dot at its right end, like the `●` in the tmux status bar, while any agent in any space is blocked or finished unseen. Clicking it shows that agent, blocked ones first.
