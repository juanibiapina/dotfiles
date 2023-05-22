{ pkgs, lib, ... }:

let
  # fetch a version of nixpkgs where pcloud is working
  # https://github.com/NixOS/nixpkgs/issues/226339
  pkgs_pcloud_working = import (builtins.fetchGit {
    name = "nixos-unstable-pcloud-working";
    url = "https://github.com/nixos/nixpkgs/";
    rev = "e3652e0735fbec227f342712f180f4f21f0594f2";
  }) {
    config.allowUnfreePredicate = pkg:
      builtins.elem (lib.getName pkg) (map lib.getName [
          pkgs_pcloud_working.pcloud
      ]);
  };
in
{
  environment.systemPackages = with pkgs; [
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
    pkgs_pcloud_working.pcloud
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
    xfce.thunar # file manager
    xorg.xev
    xsel
    zathura # pdf viewer
    zip
    (callPackage ./packages/antr.nix {})
    (callPackage ./packages/jaime.nix {})
    (callPackage ./packages/sub.nix {})
    (callPackage ./packages/hamsket.nix {})
  ];
}
