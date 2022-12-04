{ pkgs, lib, ... }:

{
  environment.systemPackages = with pkgs; [
    alacritty
    awscli2
    barrier
    bat # required for man
    cachix
    cmake
    curlie
    direnv
    discord
    dmenu
    dropbox
    dunst
    dwm
    fd
    file
    filezilla
    firefox-devedition-bin
    fzf
    gcc
    gh
    gimp
    git
    git-crypt
    gitAndTools.delta
    gitAndTools.hub
    glxinfo
    gnome.cheese
    gnome.nautilus
    gnumake
    gnupg
    htop
    jq
    keepassxc
    killall
    libnotify
    lsof
    lxappearance
    mpv
    ncdu
    neovim-unwrapped
    obs-studio
    optifine # for minecraft
    parallel
    pasystray
    pavucontrol
    pciutils
    pcloud
    python3
    ripgrep
    rofi
    shutter
    simplenote
    slack
    spotifywm
    ssm-session-manager-plugin
    starship
    stow
    tmux
    tree
    udiskie
    universal-ctags
    unzip
    usbutils
    vim
    vlc
    wget
    wmctrl
    xclip
    xdotool
    xorg.xev
    xsel
    zip
    zoom-us
    (callPackage ./packages/antr.nix {})
    (callPackage ./packages/jaime.nix {})
    (callPackage ./packages/sub.nix {})
    (callPackage ./packages/hamsket.nix {})
  ];
}
