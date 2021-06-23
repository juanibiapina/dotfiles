# Edit this configuration file to define what should be installed on
# your system.  Help is available in the configuration.nix(5) man page
# and in the NixOS manual (accessible by running ‘nixos-help’).

{ config, pkgs, ... }:

{
  imports =
    [ # Include the results of the hardware scan.
      /etc/nixos/hardware-configuration.nix
    ];

  # Load AMD module
  boot.initrd.kernelModules = [ "amdgpu" ];

  # Use the systemd-boot EFI boot loader.
  boot.loader.systemd-boot.enable = true;
  boot.loader.efi.canTouchEfiVariables = true;

  # networking.hostName = "nixos"; # Define your hostname.
  # networking.wireless.enable = true;  # Enables wireless support via wpa_supplicant.

  # Set time zone
  time.timeZone = "Europe/Berlin";

  # The global useDHCP flag is deprecated, therefore explicitly set to false here.
  # Per-interface useDHCP will be mandatory in the future, so this generated config
  # replicates the default behaviour.
  networking.useDHCP = false;
  networking.interfaces.enp9s0.useDHCP = true;
  #networking.interfaces.wlp7s0.useDHCP = true;

  # Configure network proxy if necessary
  # networking.proxy.default = "http://user:password@proxy:port/";
  # networking.proxy.noProxy = "127.0.0.1,localhost,internal.domain";

  # Select internationalisation properties.
  i18n.defaultLocale = "en_US.UTF-8";
  # console = {
  #   font = "Lat2-Terminus16";
  #   keyMap = "us";
  # };

  # Install and configure fonts
  fonts = {
    fonts = with pkgs; [
      source-code-pro
      source-sans-pro
      source-serif-pro
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

  # Configure X server
  services.xserver = {
    enable = true;

    layout = "us";
    xkbOptions = "terminate:ctrl_alt_bksp,ctrl:nocaps";

    xrandrHeads = [
      {
        output = "HDMI-A-0";
        primary = true;
      }
      {
        output = "DisplayPort-2";
      }
    ];

    # disable mouse acceleration
    libinput.enable = true;
    libinput.mouse.accelProfile = "flat";

    displayManager.sddm = {
      enable = true;
    };
    displayManager.defaultSession = "none+awesome";
    displayManager.autoLogin = {
      user = "juan";
      enable = true;
    };

    windowManager.awesome.enable = true;

    videoDrivers = [ "amdgpu" ];
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
  services.printing.enable = true;
  services.printing.drivers = let
    mfcj4420dwlpr = (pkgs.callPackage ./packages/mfcj4420dwlpr.nix {});
    mfcj4420dwcupswrapper = (pkgs.callPackage ./packages/mfcj4420dwcupswrapper.nix {
      mfcj4420dwlpr = mfcj4420dwlpr;
    });
  in [ pkgs.brgenml1lpr pkgs.brgenml1cupswrapper mfcj4420dwlpr mfcj4420dwcupswrapper ];

  # workarounds from https://github.com/NixOS/nixpkgs/issues/118628 so I don't
  # have to manually restart cups
  services.avahi.enable = true;
  services.avahi.nssmdns = false; # Use my settings from below
  # settings from avahi-daemon.nix where mdns is replaced with mdns4
  system.nssModules = with pkgs.lib; optional (!config.services.avahi.nssmdns) pkgs.nssmdns;
  system.nssDatabases.hosts = with pkgs.lib; optionals (!config.services.avahi.nssmdns) (mkMerge [
    (mkOrder 900 [ "mdns4_minimal [NOTFOUND=return]" ]) # must be before resolve
    (mkOrder 1501 [ "mdns4" ]) # 1501 to ensure it's after dns
  ]);

  # Enable sound.
  sound.enable = true;
  hardware.pulseaudio.enable = true;

  # Enable touchpad support (enabled default in most desktopManager).
  # services.xserver.libinput.enable = true;

  # Define a user account
  users.users.juan = {
    description = "Juan Ibiapina";
    isNormalUser = true;
    hashedPassword = "$6$Rkbgpo6Vup$lgMtnmWatUHOLmj6UeJQGr/WTQ.MhaukfBFipgMhqAyVopJtzayYFQYaMLY/HJsGQr4Gsz5QFdHta4/Xg71U2/";
    shell = pkgs.zsh;
    extraGroups = [ "wheel" "docker" "audio" ]; # Enable ‘sudo’ and access to docker and audio
  };

  # Do not require a password for sudo
  security.sudo.wheelNeedsPassword = false;

  # Allow installing unfree packages
  nixpkgs.config.allowUnfree = true;

  # List packages installed in system profile. To search, run:
  # $ nix search wget
  environment.systemPackages = with pkgs; [
    alacritty
    bat
    blender
    cmake
    direnv
    discord
    dmenu
    dropbox
    dunst
    dwm
    fd
    firefox-devedition-bin
    fzf
    gcc
    gimp
    git
    git-crypt
    gitAndTools.delta
    gitAndTools.hub
    gnome3.cheese
    gnome3.nautilus
    gnumake
    gnupg
    htop
    jq
    keepassx-community
    killall
    libnotify
    lsof
    mpv
    ncdu
    neovim-unwrapped
    obs-studio
    parallel
    pasystray
    pavucontrol
    pciutils
    qutebrowser
    ripgrep
    rofi
    rustup
    shutter
    simplenote
    slack
    spotifywm
    starship
    stow
    tmux
    universal-ctags
    unzip
    vim
    vlc
    wget
    wmctrl
    xdotool
    xorg.xev
    zip
    zoom-us
    (callPackage ./packages/jaime.nix {})
    (callPackage ./packages/sub.nix {})
  ];

  # Enable zsh as an interactive shell
  programs.zsh = {
    enable = true;
    setOptions = [];
    enableGlobalCompInit = false;
    enableBashCompletion = false;
  };

  # Enable gnupg agent
  programs.gnupg.agent.enable = true;

  # Enable steam
  programs.steam.enable = true;

  # Enable flatpak package manager
  services.flatpak.enable = true;
  xdg.portal.enable = true;

  # Enable the OpenSSH daemon.
  services.openssh.enable = true;

  # Open ports in the firewall.
  networking.firewall.allowedTCPPorts = [ 24800 ];
  # networking.firewall.allowedUDPPorts = [ ... ];
  # Or disable the firewall altogether.
  # networking.firewall.enable = false;

  # Enable docker
  virtualisation.docker.enable = true;

  # Enable virtual box
  #virtualisation.virtualbox.host.enable = true;
  #virtualisation.virtualbox.host.enableExtensionPack = true;
  #virtualisation.virtualbox.host.enableHardening = false;

  # This value determines the NixOS release from which the default
  # settings for stateful data, like file locations and database versions
  # on your system were taken. It‘s perfectly fine and recommended to leave
  # this value at the release version of the first install of this system.
  # Before changing this value read the documentation for this option
  # (e.g. man configuration.nix or on https://nixos.org/nixos/options.html).
  system.stateVersion = "20.09"; # Did you read the comment?

}
