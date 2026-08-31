# Android build toolchain for the Expo/React Native app in juanibiapina/zero
# (apps/agent-mobile). Provides the exact SDK/NDK/build-tools/cmake versions
# Expo SDK 57 / React Native 0.86 pin, so a standalone APK can be built locally
# instead of on EAS. Enter with `nix develop <dotfiles>#android`. Works on the
# mini host (x86_64-linux) and both Macs (aarch64-darwin).
#
# The aapt2 override below is a NixOS-only fix: gradle otherwise downloads an
# aapt2 that is dynamically linked against a glibc path that does not exist on
# NixOS and fails to run. GRADLE_OPTS points the Android Gradle Plugin at the
# Nix-store aapt2 instead (the canonical fix from the nixpkgs manual and the
# NixOS wiki). On darwin the SDK's own aapt2 runs natively, so it is left unset.
{ pkgs }:
let
  buildToolsVersion = "36.0.0";
  ndkVersion = "27.1.12297006";
  cmakeVersion = "3.22.1";

  androidComposition = pkgs.androidenv.composeAndroidPackages {
    platformVersions = [ "36" "35" ];
    buildToolsVersions = [ buildToolsVersion "35.0.0" ];
    includeNDK = true;
    ndkVersions = [ ndkVersion ];
    cmakeVersions = [ cmakeVersion ];
    includeEmulator = false;
    includeSystemImages = false;
  };
  androidSdk = androidComposition.androidsdk;
  sdkRoot = "${androidSdk}/libexec/android-sdk";
in
pkgs.mkShell {
  buildInputs = [
    androidSdk
    pkgs.jdk17
    pkgs.nodejs_22
  ];

  ANDROID_HOME = sdkRoot;
  ANDROID_SDK_ROOT = sdkRoot;
  JAVA_HOME = "${pkgs.jdk17}";

  # Make gradle use the Nix-store aapt2 (the downloaded one cannot run on NixOS).
  # Linux-only: on darwin the SDK aapt2 runs natively, so leave GRADLE_OPTS empty.
  GRADLE_OPTS = pkgs.lib.optionalString pkgs.stdenv.isLinux
    "-Dorg.gradle.project.android.aapt2FromMavenOverride=${sdkRoot}/build-tools/${buildToolsVersion}/aapt2";

  shellHook = ''
    export ANDROID_NDK_ROOT="${sdkRoot}/ndk/${ndkVersion}"
    export ANDROID_NDK_HOME="$ANDROID_NDK_ROOT"
    echo "android dev shell ready"
    echo "  ANDROID_SDK_ROOT=$ANDROID_SDK_ROOT"
    echo "  NDK=$ANDROID_NDK_ROOT"
    echo "  jdk=$(java -version 2>&1 | head -1)"
  '';
}
