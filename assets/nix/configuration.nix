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

  # add my user to trusted users
  nix.settings.trusted-users = [ "root" "juan" ];

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

  # Enable touchpad support (enabled default in most desktopManager).
  # services.xserver.libinput.enable = true;

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
