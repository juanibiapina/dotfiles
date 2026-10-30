# Android development

`mini` and `macm1` can build the Expo app in
[`juanibiapina/zero`](https://github.com/juanibiapina/zero) (`apps/agent-mobile`)
and drive it on a USB-attached Android device (e.g. a Pixel).

## What is installed

- **`adb` / `fastboot`**: on `macm1`, the `android-platform-tools` Homebrew cask
  (`nix/modules/macos/system.nix`); on `mini`, `nix/hosts/mini/modules/android.nix`.
- **`maestro`**: element-based UI driver, system-wide on both hosts. Bundles its own JRE.
- **Local build toolchain**: the `#android` dev shell from
  [`nix/shells/android.nix`](../nix/shells/android.nix), which pins the SDK, NDK,
  build-tools, and JDK and sets their environment variables:

  ```bash
  nix develop <dotfiles>#android
  ```

  Run `eas build --local`, `expo prebuild`, `expo run:android`, and `gradlew`
  **inside** this shell. The SDK is kept out of the system so system rebuilds
  stay light.

## Building on mini

Build a standalone APK on `mini` when the EAS quota is exhausted:

```bash
export NIXPKGS_ACCEPT_ANDROID_SDK_LICENSE=1
nix develop ~/workspace/juanibiapina/dotfiles#android --command bash -c '
  cd ~/workspace/juanibiapina/zero/apps/agent-mobile
  eas build --platform android --profile preview --local --non-interactive \
    --output /tmp/local-preview.apk'
```

## Differences between the hosts

`mini` is headless, so it ships a shared adb key via agenix and a udev rule.
`macm1` has no udev and is interactive: tap **"Allow USB debugging"** on the
device the first time.

## Driving a connected device

See the "Physical device testing" and Maestro sections of
`apps/agent-mobile/README.md` in `juanibiapina/zero` for the full flow
(dev client + Metro over `adb reverse`, Maestro flows in `.maestro/`). Quick
check:

```bash
adb devices                 # the Pixel should be listed
maestro test apps/agent-mobile/.maestro/release/01-capture-inbox.yaml
```
