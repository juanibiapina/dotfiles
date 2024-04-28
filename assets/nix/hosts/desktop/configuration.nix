{ pkgs, ... }:

{
  imports =
    [
      ./hardware-configuration.nix
      ../../cachix.nix
      ../../modules/system.nix
      ./packages.nix
    ];

  networking.hostId = "74461bc6";
  networking.hostName = "desktop";

  # Enable network manager
  # This is also enabled automatically by Gnome.
  networking.networkmanager.enable = true;

  # This input method fixes a problem in Whatsapp Web where the input field is
  # reset if the first character has an accent
  i18n.inputMethod.enabled = "fcitx5";

  # console = {
  #   font = "Lat2-Terminus16";
  #   keyMap = "us";
  # };

  # Install and configure fonts
  fonts = {
    packages = with pkgs; [
      (nerdfonts.override { fonts = [ "SourceCodePro" ]; })
      font-awesome
    ];

    fontconfig = {
      defaultFonts = {
        monospace = [ "Source Code Pro" ];
        sansSerif = [ "Source Sans Pro" ];
        serif     = [ "Source Serif Pro" ];
      };
    };
  };

  # Disable power management
  powerManagement.enable = false;

  # configure keyd for key mappings
  services.keyd = {
    enable = true;
    keyboards.default.settings = {
      main = {
        capslock = "overload(control, esc)";
      };
    };
  };

  # Configure X server
  services.xserver = {
    enable = true;

    xkb = {
      layout = "us";
      model = "pc104";
      variant = "mac";
      options = "terminate:ctrl_alt_bksp,lv3:lwin_switch";
    };

    # Whether to symlink the X server configuration under /etc/X11/xorg.conf
    # this is necessary for some X commands to work, like localectl
    exportConfiguration = true;

    # mouse acceleration
    libinput = {
      enable = true;
      mouse = {
        accelProfile = "adaptive";
        accelSpeed = "-0.5";
      };
    };

    displayManager.sddm = {
      enable = true;
      autoNumlock = true; # doesn't seem to work
    };
    displayManager.defaultSession = "none+awesome";
    displayManager.autoLogin = {
      user = "juan";
      enable = true;
    };

    # Workaround to fix GTK icons in awesome
    desktopManager.gnome.enable = true;

    windowManager.awesome.enable = true;

    videoDrivers = [ "amdgpu" ];
  };

  # workarounds for autologin since these dependencies are not properly configured be default
  systemd.services.display-manager.wants = [ "systemd-user-sessions.service" "multi-user.target" "network-online.target" ];
  systemd.services.display-manager.after = [ "systemd-user-sessions.service" "multi-user.target" "network-online.target" ];

  # Enable sound.
  sound.enable = true;
  hardware.pulseaudio.enable = true;

  # Enable bluetooth
  hardware.bluetooth.enable = true;
  services.blueman.enable = true;

  # xdg settings
  xdg.mime.defaultApplications = {
    "default-web-browser" = "vivaldi.desktop";
    "text/html" = "vivaldi.desktop";
    "application/pdf" = "org.pwmt.zathura.desktop";
    "x-scheme-handler/http" = "vivaldi.desktop";
    "x-scheme-handler/https" = "vivaldi.desktop";
    "x-scheme-handler/about" = "vivaldi.desktop";
    "x-scheme-handler/unknown" = "vivaldi.desktop";
    "inode/directory" = "nautilus.desktop";
  };

  # Open ports in the firewall.
  networking.firewall.allowedTCPPorts = [ 24800 ];
  # networking.firewall.allowedUDPPorts = [ ... ];

  # Enable docker
  virtualisation.docker.enable = true;
  virtualisation.docker.liveRestore = false; # prevent delays when restarting NixOS

  # This value determines the NixOS release from which the default
  # settings for stateful data, like file locations and database versions
  # on your system were taken. It's perfectly fine and recommended to leave
  # this value at the release version of the first install of this system.
  # Before changing this value read the documentation for this option
  # (e.g. man configuration.nix or on https://nixos.org/nixos/options.html).
  system.stateVersion = "23.05"; # Did you read the comment?
}
