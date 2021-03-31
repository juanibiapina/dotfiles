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

  # Set your time zone.
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

    displayManager.lightdm.enable = true;
    displayManager.defaultSession = "none+awesome";
    displayManager.autoLogin = {
      user = "juan";
      enable = true;
    };

    windowManager.awesome.enable = true;

    videoDrivers = [ "amdgpu" ];
  };

  # Configure interception tools (map capslock to both control and esc)
  services.interception-tools = {
    enable = true;
    plugins = [ (import ./packages/caps2esc.nix) ];
    udevmonConfig = ''
      - JOB: "intercept -g $DEVNODE | caps2esc | uinput -d $DEVNODE"
        DEVICE:
          EVENTS:
            EV_KEY: [KEY_CAPSLOCK]
    '';
  };

  # Enable CUPS to print documents.
  # services.printing.enable = true;

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
    dwm
    fd
    firefox-devedition-bin
    fzf
    gcc
    gimp
    git
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
    minetest
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
    zip
    zoom-us
    (import ./packages/jaime.nix)
    (import ./packages/sub.nix)
  ];

  # Some programs need SUID wrappers, can be configured further or are
  # started in user sessions.
  # programs.mtr.enable = true;
  # programs.gnupg.agent = {
  #   enable = true;
  #   enableSSHSupport = true;
  # };

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

  # List services that you want to enable:

  # Enable the OpenSSH daemon.
  # services.openssh.enable = true;

  # Open ports in the firewall.
  # networking.firewall.allowedTCPPorts = [ ... ];
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

