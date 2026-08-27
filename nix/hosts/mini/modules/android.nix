{ pkgs, ... }:

{
  # Android Debug Bridge for controlling a USB-attached device (Pixel 7).
  environment.systemPackages = with pkgs; [
    android-tools # adb + fastboot
    scrcpy # screen mirror / control (needs the headless-wayland display)
  ];

  # systemd uaccess only grants device access to an active seat session; an SSH
  # login is not one. Grant the `adbusers` group direct access instead so the
  # lingering `juan` user can reach the device headless. 18d1 = Google (Pixel).
  services.udev.extraRules = ''
    SUBSYSTEM=="usb", ATTR{idVendor}=="18d1", MODE="0660", GROUP="adbusers", TAG+="uaccess"
  '';
  users.groups.adbusers = { };
  users.users.juan.extraGroups = [ "adbusers" ];
}
