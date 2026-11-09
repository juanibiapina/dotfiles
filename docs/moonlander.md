# ZSA Moonlander

The Moonlander's layout is QMK firmware built from this repo. Oryx is not used.

## Layout

The layout lives in [`keyboards/moonlander/`](../keyboards/moonlander/):

- `keymap.c`: the layers, as `LAYOUT_moonlander(...)` grids of [QMK keycodes](https://docs.qmk.fm/keycodes)
- `config.h` and `rules.mk`: QMK settings and features
- `keymap.json`: the ZSA community modules (`zsa/oryx`, `zsa/defaults`)
- `keymap-drawer.yaml` and `keymap-drawer-types.yq`: labels, colours and key categories for the drawing

`dev keyboard draw` renders the layout with [keymap-drawer](https://github.com/caksoylar/keymap-drawer) and opens it.

QMK cannot send the Mac fn (Globe) key. The fn key sends `KC_F24`, and a Moonlander-only rule in [`karabiner.json`](../dotfiles/karabiner/.config/karabiner/karabiner.json) turns F24 into fn. Other Karabiner rules there apply to every keyboard, including the Moonlander.

It started as Oryx's Moonlander Default Layout (firmware v25). `config.h` sets its own `SERIAL_NUMBER`: Keymapp and Oryx look layouts up by serial number, and ZSA's default serial would make them show Oryx's default layout.

## Build and flash

```bash
dev keyboard flash
```

It builds the firmware with Nix and waits for the keyboard. Put the board in bootloader mode in one of two ways:

- Hold `;` and press the top-right key on the right half (`QK_BOOT` on layer 2).
- Press the reset pinhole with a paperclip.

To only build: `nix build .#moonlander-firmware`.

## How it builds

- The board is revision A (USB `3297:1969`), so the target is `zsa/moonlander/reva`.
- [`nix/packages/moonlander-firmware.nix`](../nix/packages/moonlander-firmware.nix) builds against ZSA's QMK fork, pinned by the `qmk-zsa` flake input to branch `firmware25`. The `qmk` package from nixpkgs provides the toolchain.
- `QMK_USERSPACE` points at an empty directory. Without it, QMK adds `/users/<keymap>` to the include path, which on macOS resolves to the home directory.
- Flashing uses `dfu-util` with QMK's arguments for the STM32 bootloader. ZSA's `zapp` is unfree in nixpkgs.

To move to a newer ZSA firmware branch, change the `ref` of the `qmk-zsa` input, run `nix flake lock --update-input qmk-zsa`, and rebuild.

## Recovery

Flash Oryx's default layout from <https://configure.zsa.io/moonlander/layouts/default> with "Save to my keyboard" in Chrome.
