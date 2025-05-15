{ config, pkgs, ... }:

{
  # Home Manager required configuration
  home.username = "juan";

  # This value determines the Home Manager release that your configuration is
  # compatible with. This helps avoid breakage when a new Home Manager release
  # introduces backwards incompatible changes.
  #
  # You should not change this value, even if you update Home Manager. If you do
  # want to update the value, then make sure to first check the Home Manager
  # release notes.
  home.stateVersion = "23.11"; # Please read the comment before changing.

  # Configure ssh aliases
  #programs.ssh = {
  #  enable = true;

  #  extraConfig = ''
  #    Host desktop
  #      User juan
  #      HostName 192.168.188.109

  #    Host mini
  #      User juan
  #      HostName 192.168.188.30
  #  '';
  #};

  home.file = {
    ".config/nix/nix.conf".text = ''
      keep-derivations = true
      keep-outputs = true
      experimental-features = nix-command flakes
      substituters = https://cache.nixos.org https://juanibiapina.cachix.org https://nix-community.cachix.org
      trusted-public-keys = cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY= juanibiapina.cachix.org-1:bUZRS3Ty+eSUDlN+nMxpnvRprzgPouA19C9MjApilvo= nix-community.cachix.org-1:mB9FSh9qf2dCimDSUo8Zy7bkq5CX+/rkCWyvRCYg3Fs=
    '';
  };

  # Home Manager can also manage your environment variables through
  # 'home.sessionVariables'. These will be explicitly sourced when using a
  # shell provided by Home Manager. If you don't want to manage your shell
  # through Home Manager then you have to manually source 'hm-session-vars.sh'
  # located at either
  #
  #  ~/.nix-profile/etc/profile.d/hm-session-vars.sh
  #
  # or
  #
  #  ~/.local/state/nix/profiles/profile/etc/profile.d/hm-session-vars.sh
  #
  # or
  #
  #  /etc/profiles/per-user/juan/etc/profile.d/hm-session-vars.sh
  #
  home.sessionVariables = {
    # EDITOR = "emacs";
  };
}
