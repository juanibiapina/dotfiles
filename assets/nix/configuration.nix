# Edit this configuration file to define what should be installed on
# your system.  Help is available in the configuration.nix(5) man page
# and in the NixOS manual (accessible by running ‘nixos-help’).

{ config, pkgs, nixpkgs_pcloud_working, ... }:

{
  imports =
    [
      ./hardware-configuration.nix
      ./cachix.nix
      ./packages.nix
    ];

  # Do not preload modules since it adds to the size of the init image
  #boot.initrd.kernelModules = [];

  # Boot loader
  boot.loader.systemd-boot.enable = true;
  boot.loader.systemd-boot.consoleMode = "max";
  boot.loader.efi.canTouchEfiVariables = true;
  boot.supportedFilesystems = ["zfs"];

  networking.hostId = "74461bc6";
  # networking.hostName = "nixos"; # Define your hostname.
  # networking.wireless.enable = true;  # Enables wireless support via wpa_supplicant.

  # Set time zone
  time.timeZone = "Europe/Berlin";

  # The global useDHCP flag is deprecated, therefore explicitly set to false here.
  # Per-interface useDHCP will be mandatory in the future, so this generated config
  # replicates the default behaviour.
  # networking.useDHCP = false;
  # networking.interfaces.enp4s0.useDHCP = true;
  #networking.interfaces.wlp7s0.useDHCP = true;

  # Enable network manager
  # This is also enabled automatically by Gnome.
  networking.networkmanager.enable = true;

  # Set default locale
  i18n.defaultLocale = "en_US.UTF-8";

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

  # enable flakes
  nix.settings.experimental-features = [ "nix-command" "flakes" ];

  # Configure X server
  services.xserver = {
    enable = true;

    layout = "us";
    xkbModel = "pc104";
    xkbVariant = "mac";
    xkbOptions = "terminate:ctrl_alt_bksp,ctrl:nocaps,lv3:lwin_switch";

    # Whether to symlink the X server configuration under /etc/X11/xorg.conf
    # this is necessary for some X commands to work, like localectl
    exportConfiguration = true;

    # disabled because the nvidia driver seems to be incompatible
    #xrandrHeads = [
    #  {
    #    output = "HDMI-0";
    #    primary = true;
    #  }
    #  {
    #    output = "DP-0";
    #    primary = true;
    #  }
    #];

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

    videoDrivers = [ "nvidia" ];
  };

  # workarounds for autologin since these dependencies are not properly configured be default
  systemd.services.display-manager.wants = [ "systemd-user-sessions.service" "multi-user.target" "network-online.target" ];
  systemd.services.display-manager.after = [ "systemd-user-sessions.service" "multi-user.target" "network-online.target" ];

  # Configure interception tools (map capslock to both control and esc)
  services.interception-tools = let
    caps2esc = (pkgs.callPackage ./packages/caps2esc.nix {});
  in {
    enable = true;
    plugins = [ caps2esc ];
    udevmonConfig = ''
      - JOB: "${pkgs.interception-tools}/bin/intercept -g $DEVNODE | ${caps2esc}/bin/caps2esc | ${pkgs.interception-tools}/bin/uinput -d $DEVNODE"
        DEVICE:
          EVENTS:
            EV_KEY: [KEY_CAPSLOCK]
    '';
  };

  # Configure printing
  # the brgen drivers are included only to display a "Brother" model in CUPS
  #services.printing.enable = true;
  #services.printing.drivers = let
  #  mfcj4420dwlpr = (pkgs.callPackage ./packages/mfcj4420dwlpr.nix {});
  #  mfcj4420dwcupswrapper = (pkgs.callPackage ./packages/mfcj4420dwcupswrapper.nix {
  #    mfcj4420dwlpr = mfcj4420dwlpr;
  #  });
  #in [ pkgs.brgenml1lpr pkgs.brgenml1cupswrapper mfcj4420dwlpr mfcj4420dwcupswrapper ];

  # workarounds from https://github.com/NixOS/nixpkgs/issues/118628 so I don't
  # have to manually restart cups
  #services.avahi.enable = true;
  #services.avahi.nssmdns = false; # Use my settings from below
  ## settings from avahi-daemon.nix where mdns is replaced with mdns4
  #system.nssModules = with pkgs.lib; optional (!config.services.avahi.nssmdns) pkgs.nssmdns;
  #system.nssDatabases.hosts = with pkgs.lib; optionals (!config.services.avahi.nssmdns) (mkMerge [
  #  (mkOrder 900 [ "mdns4_minimal [NOTFOUND=return]" ]) # must be before resolve
  #  (mkOrder 1501 [ "mdns4" ]) # 1501 to ensure it's after dns
  #]);

  # Enable sound.
  sound.enable = true;
  hardware.pulseaudio.enable = true;

  # Enable bluetooth
  hardware.bluetooth.enable = true;
  services.blueman.enable = true;

  # Enable touchpad support (enabled default in most desktopManager).
  # services.xserver.libinput.enable = true;

  # xdg settings
  xdg.mime.defaultApplications = {
    "default-web-browser" = "firefox.desktop";
    "text/html" = "firefox.desktop";
    "application/pdf" = "org.pwmt.zathura.desktop";
    "x-scheme-handler/http" = "firefox.desktop";
    "x-scheme-handler/https" = "firefox.desktop";
    "x-scheme-handler/about" = "firefox.desktop";
    "x-scheme-handler/unknown" = "firefox.desktop";
  };

  # Define a user account
  users.users.juan = {
    description = "Juan Ibiapina";
    isNormalUser = true;
    hashedPassword = "$6$Rkbgpo6Vup$lgMtnmWatUHOLmj6UeJQGr/WTQ.MhaukfBFipgMhqAyVopJtzayYFQYaMLY/HJsGQr4Gsz5QFdHta4/Xg71U2/";
    shell = pkgs.zsh;
    extraGroups = [ "wheel" "docker" "audio" "networkmanager" ]; # Enable ‘sudo’ and access to docker and audio
  };

  # Do not require a password for sudo
  security.sudo.wheelNeedsPassword = false;

  # Enable zsh as an interactive shell
  programs.zsh = {
    enable = true;
    setOptions = [];
    enableGlobalCompInit = false;
    enableBashCompletion = false;
  };

  # Enable gnupg agent
  programs.gnupg.agent.enable = true;

  # Steam
  programs.steam.enable = true;

  # Enable the OpenSSH daemon.
  services.openssh.enable = true;

  # Open ports in the firewall.
  networking.firewall.allowedTCPPorts = [ 24800 ];
  # networking.firewall.allowedUDPPorts = [ ... ];
  # Or disable the firewall altogether.
  # networking.firewall.enable = false;

  # Enable docker
  virtualisation.docker.enable = true;
  virtualisation.docker.liveRestore = false; # prevent delays when restarting NixOS

  # Enable virtual box
  #virtualisation.virtualbox.host.enable = true;
  #virtualisation.virtualbox.host.enableExtensionPack = true;
  #virtualisation.virtualbox.host.enableHardening = false;

  # This value determines the NixOS release from which the default
  # settings for stateful data, like file locations and database versions
  # on your system were taken. It's perfectly fine and recommended to leave
  # this value at the release version of the first install of this system.
  # Before changing this value read the documentation for this option
  # (e.g. man configuration.nix or on https://nixos.org/nixos/options.html).
  system.stateVersion = "23.05"; # Did you read the comment?
}
