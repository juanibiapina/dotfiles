# Android development on the Macs

Both Macs (`macm1`, `macr`) can build and drive the Expo app in
[`juanibiapina/zero`](https://github.com/juanibiapina/zero) (`apps/agent-mobile`)
on a USB-attached Android device (e.g. a Pixel). This mirrors the `mini` host,
minus its headless-Linux parts.

## What is installed

- **`adb` / `fastboot`** — the `android-platform-tools` Homebrew cask
  (`nix/modules/macos/system.nix`).
- **`maestro`** — element-based UI driver, system-wide from nixpkgs
  (`nix/modules/macos/system.nix`). Bundles its own JRE.
- **Local build toolchain** — the exact Expo-SDK-57 / RN-0.86 SDK / NDK /
  build-tools / JDK 17 / Node, as a dev shell:

  ```bash
  nix develop <dotfiles>#android
  ```

  This sets `ANDROID_HOME` / `ANDROID_SDK_ROOT` / `JAVA_HOME` / `ANDROID_NDK_ROOT`.
  Run `eas build --local`, `expo prebuild`, `expo run:android`, and `gradlew`
  **inside** this shell. The SDK is kept out of the system so `darwin-rebuild`
  stays light.

## Differences from `mini`

- **No shared adb key, no udev rule.** macOS has no udev, and the Macs are
  interactive: tap **"Allow USB debugging"** on the device the first time (the
  `mini` host ships a shared adb key via agenix because it is headless).
- **JDK/SDK are not system-wide** — only in the `#android` shell.

## Driving a connected device

See the "Physical device testing" and Maestro sections of
`apps/agent-mobile/README.md` in `juanibiapina/zero` for the full flow
(dev client + Metro over `adb reverse`, Maestro flows in `.maestro/`). Quick
check:

```bash
adb devices                 # the Pixel should be listed
maestro test apps/agent-mobile/.maestro/release/01-capture-inbox.yaml
```
