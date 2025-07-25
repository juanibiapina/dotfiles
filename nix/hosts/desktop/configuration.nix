{ pkgs, lib, ... }:

{
  imports =
    [
      ./hardware-configuration.nix
      ../../cachix.nix
      ../../modules/substituters.nix
      ../../modules/bluetooth.nix
      ../../modules/hosts.nix
      ../../modules/keyd.nix
      ../../modules/syncthing-server.nix
      ../../modules/openssh.nix
      ../../modules/system.nix
      ../../modules/python.nix
      ./packages.nix
    ];

  networking.hostId = "74461bc6";
  networking.hostName = "desktop";

  nix.settings = {
    substituters = [
      "http://mini.home.arpa:3001"
    ];
    trusted-public-keys = [
      "mini.home.arpa:oKnQjR3POJD+uqUqn1SNC8StOSLFU6lZ2q3OUsVQPco="
    ];
  };

  # Enable wake on lan
  networking.interfaces.enp4s0.wakeOnLan.enable = true;

  # Enable network manager
  # This is also enabled automatically by Gnome.
  networking.networkmanager.enable = true;

  # Install and configure fonts
  fonts = {
    packages = with pkgs; [
      nerd-fonts.sauce-code-pro
      dejavu_fonts
      noto-fonts-emoji
    ];

    fontconfig = {
      defaultFonts = {
        monospace = [ "SauceCodePro Nerd Font" ];
        sansSerif = [ "DejaVu Sans" ];
        serif     = [ "DejaVu Serif" ];
        emoji     = [ "Noto Color Emoji" ];
      };
    };
  };

  # Power management
  powerManagement.enable = true;

  # mouse acceleration
  services.libinput = {
    enable = true;
    mouse = {
      accelProfile = "adaptive";
      accelSpeed = "-0.5";
    };
  };

  # X server
  services.xserver = {
    enable = true;

    xkb = {
      model = "pc104";
      layout = "abc";
      variant = "extended";
      options = "terminate:ctrl_alt_bksp,lv3:lwin_switch";
      extraLayouts = {
        "abc" = {
          description = "ABC layout similar to macOS";
          languages = [ "eng" ];
          symbolsFile = ./symbols/abc.xkb;
        };
      };
    };

    # Whether to symlink the X server configuration under /etc/X11/xorg.conf
    # this is necessary for some X commands to work, like localectl
    exportConfiguration = lib.mkForce true;

    videoDrivers = [ "amdgpu" ];
  };

  # Workaround to fix icons in GTK apps
  services.desktopManager.gnome.enable = true;

  # dbus
  # There's something else in the configuration that already enables dbus, but
  # I'm not sure what it is, so it's also enabled here in case it's removed from
  # the other place.
  services.dbus = {
    enable = true;
  };

  # display manager
  services.displayManager.sddm = {
    enable = true;
    autoNumlock = true; # doesn't seem to work
  };
  services.displayManager.defaultSession = "sway";
  services.displayManager.autoLogin = {
    user = "juan";
    enable = true;
  };

  # workarounds for autologin
  # https://github.com/NixOS/nixpkgs/issues/103746#issuecomment-945091229
  systemd.services."getty@tty1".enable = false;
  systemd.services."autovt@tty1".enable = false;

  # workaround for crash coming back from suspend
  systemd.services.systemd-suspend.environment.SYSTEMD_SLEEP_FREEZE_USER_SESSIONS = "false";

  # Enable sound.
  # disable pulseaudio
  services.pulseaudio.enable = false;
  # rtkit is optional but recommended
  security.rtkit.enable = true;
  # enable pipewire
  services.pipewire = {
    enable = true;
    alsa.enable = true;
    alsa.support32Bit = true;
    pulse.enable = true;
  };

  # xdg settings
  # apps are found in /run/current-system/sw/share/applications
  xdg.mime.defaultApplications = {
    "default-web-browser" = "firefox-developer-edition.desktop";
    "text/html" = "firefox-developer-edition.desktop";
    "application/pdf" = "org.kde.okular.desktop";
    "x-scheme-handler/http" = "firefox-developer-edition.desktop";
    "x-scheme-handler/https" = "firefox-developer-edition.desktop";
    "x-scheme-handler/about" = "firefox-developer-edition.desktop";
    "x-scheme-handler/unknown" = "firefox-developer-edition.desktop";
    "inode/directory" = "org.gnome.Nautilus.desktop";
    "image/svg+xml" = "org.gnome.eog.desktop";
  };

  # Configure keys for syncthing
  services.syncthing = {
    cert = "/home/juan/Sync/secrets/desktop.syncthing.cert.pem";
    key = "/home/juan/Sync/secrets/desktop.syncthing.key.pem";
  };

  programs.sway = {
    enable = true;
    extraPackages = with pkgs; [ grim pulseaudio swayidle swaylock wl-clipboard wl-color-picker slurp wev ];
    wrapperFeatures.gtk = true;
  };

  hardware = {
    graphics = {
        enable = true;
        enable32Bit = true;
    };

    amdgpu.amdvlk = {
        enable = true;
        support32Bit.enable = true;
    };
  };

  # Environment variables
  environment.variables = {
    # There's an issue preventing native GTK apps from running with vulkan drivers. This is a workaround.
    GSK_RENDERER = "ngl";
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
