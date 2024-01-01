{ pkgs, nixpkgs_pcloud_working, lib, ... }:

{
  environment.systemPackages = with pkgs; [
    # browsers
    chromium
    firefox-devedition-bin
    vivaldi

    alacritty
    awscli2
    barrier
    bat # required for man
    cachix
    cmake
    curlie
    dex # autostart apps using XDG autostart
    direnv
    discord
    dmenu
    dropbox
    dunst
    dwm
    fd
    file
    filezilla
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
    hyperfine
    jq
    keepassxc
    killall
    lazygit
    libnotify
    lsof
    lxappearance
    mpv
    ncdu
    neovim-unwrapped
    nodejs # for Github Copilot vim plugin
    obs-studio
    papirus-icon-theme
    parallel
    pasystray
    pavucontrol
    pciutils
    nixpkgs_pcloud_working.pcloud
    python3
    ripgrep
    rofi
    ruby
    shutter
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
    yq-go
    zathura # pdf viewer
    zip
    (callPackage ./packages/antr.nix {})
    (callPackage ./packages/sub.nix {})
  ];
}
