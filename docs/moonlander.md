# ZSA Moonlander

The Moonlander's layout is QMK firmware built from this repo. Oryx is not used.

## Layout

The firmware builds from [`keyboards/moonlander/keymap/`](../keyboards/moonlander/keymap/):

- `keymap.c`: the layers, as `LAYOUT_moonlander(...)` grids of [QMK keycodes](https://docs.qmk.fm/keycodes)
- `config.h` and `rules.mk`: QMK settings and features
- `keymap.json`: the ZSA community modules (`zsa/oryx`, `zsa/defaults`)

The drawing builds from `keymap.c` and [`keyboards/moonlander/drawing/`](../keyboards/moonlander/drawing/):

- `keymap-drawer.yaml` and `keymap-drawer-types.yq`: labels, colours and key categories
- `editor.html` and `editor.js`: the editor page around the drawing

While a layer above the base is held, each key lights in its colour from the drawing. `TOGGLE_LAYER_COLOR` on layer 1 turns this off and on. The categories and hues in `keymap.c` copy those of the drawing, at full saturation, so change both together.

`LEDS_TOGGLE` on layer 1 turns every LED on or off, including the layer colours and the six status LEDs, and the keyboard remembers it across restarts. The status LEDs still play their startup animation.

`dev keyboard draw` renders the layout with [keymap-drawer](https://github.com/caksoylar/keymap-drawer) and opens it as an editor page. Drag a key onto another to swap them, select a key to clear it (Delete) or type a keycode for it (Enter), then press **Copy changes** and paste the list to a coding agent, which applies it to `keymap.c`. The page changes nothing by itself. On the Macs, Home Manager also copies the page to `~/.local/share/moonlander/moonlander.html` ([`moonlander-layout.nix`](../nix/modules/homemanager/moonlander-layout.nix)), so a browser bookmark to `file:///Users/juan/.local/share/moonlander/moonlander.html` shows the applied layout.

QMK cannot send the Mac fn (Globe) key. The fn key sends `KC_F24`, and a Moonlander-only rule in [`karabiner.json`](../dotfiles/karabiner/.config/karabiner/karabiner.json) turns F24 into fn. Other Karabiner rules there apply to every keyboard, including the Moonlander.

The yellow window keys live on the Windows layer, held with the middle right thumb key. The number row sends ctrl plus the key, for the main monitor's workspaces. The other window keys send the same chords as Menu (ctrl+alt+cmd) and AltGr (ctrl+alt) on other keyboards. What each chord does lives in [`aerospace.toml`](../dotfiles/aerospace/.config/aerospace/aerospace.toml).

It started as Oryx's Moonlander Default Layout (firmware v25). `config.h` sets its own `SERIAL_NUMBER`: Keymapp and Oryx look layouts up by serial number, and ZSA's default serial would make them show Oryx's default layout.

## Build and flash

```bash
dev keyboard flash
```

The Tinycast command "Flash Moonlander" runs it in a new Ghostty window.

It builds the firmware with Nix and waits for the keyboard. Put the board in bootloader mode in one of two ways:

- Hold the leftmost right thumb key and press the top-right key on the right half (`QK_BOOT` on layer 2).
- Press the reset pinhole with a paperclip.

To only build: `nix build .#moonlander-firmware`.

## How it builds

- The board is revision A (USB `3297:1969`), so the target is `zsa/moonlander/reva`.
- [`nix/packages/moonlander-firmware.nix`](../nix/packages/moonlander-firmware.nix) builds against ZSA's QMK fork, pinned by the `qmk-zsa` flake input to branch `firmware25`. The `qmk` package from nixpkgs provides the toolchain.
- `QMK_USERSPACE` points at an empty directory. Without it, QMK adds `/users/<keymap>` to the include path, which on macOS resolves to the home directory.
- Flashing uses `dfu-util` with QMK's arguments for the STM32 bootloader. ZSA's `zapp` is unfree in nixpkgs.

To move to a newer ZSA firmware branch, change the `ref` of the `qmk-zsa` input, run `nix flake lock --update-input qmk-zsa`, and rebuild.

## Test the keys

```bash
dev keyboard test
```

It lights every key red and turns each one green when pressed, on the board and in the terminal, and lists the keys never pressed. It reads matrix positions over the Oryx raw HID channel, so layer keys and empty (`KC_NO`) keys report too.

## Key usage

The Macs record every key press on the Moonlander, to find which keys and layers get used and what to move. The launchd agent `moonlander-recorder` ([`recorder.py`](../keyboards/moonlander/usage/recorder.py), [`moonlander-recorder.nix`](../nix/modules/homemanager/moonlander-recorder.nix)) runs on macm1 and mb5p and records on whichever Mac the keyboard is plugged into. It pairs over the Oryx raw HID channel, like `dev keyboard test`, so it gets the matrix position of every key down and up, and each layer change, without a firmware change. Its log is `~/Library/Logs/moonlander-recorder.log`.

The data lives in the Syncthing folder `~/Sync/moonlander`, shared by mini, macm1 and mb5p:

- `events/<host>/<YYYY-MM-DD>.tsv`: one line per event: time in Unix microseconds, event, row, col, layer. The recorder only appends, flushing every 10 seconds.
- `layouts/<sha>.json` and `flashes/<host>.tsv`: `dev keyboard flash` saves the flashed layout and the flash time, so each press resolves to the keycode it had then.

`dev keyboard usage` is the way to analyse it. It loads the data into DuckDB views of resolved presses; its help lists them.

## Recovery

Flash Oryx's default layout from <https://configure.zsa.io/moonlander/layouts/default> with "Save to my keyboard" in Chrome.
