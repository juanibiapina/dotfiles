{ self, pkgs, inputs, ... }:
{
  networking.hostName = "babbel";

  # Configure user account
  users.users.jibiapina.home = "/Users/jibiapina";

  environment.systemPackages = with pkgs; [
    (callPackage ../../packages/nvim.nix {})

    inputs.sub.packages."${pkgs.system}".sub

    bat
    fd
    fzf
    gitmux
    hyperfine
    ripgrep
    starship
    tmux
    vim
    watchexec
    zsh

    nodePackages.typescript-language-server
  ];

  # Auto upgrade nix package and the daemon service
  services.nix-daemon.enable = true;
  nix.package = pkgs.nix;

  # Enable the Nix command and flakes
  nix.settings.experimental-features = "nix-command flakes";

  # Add trusted users to the Nix daemon
  nix.settings.trusted-users = [ "root" "jibiapina" ];

  # Create /etc/zshrc that loads the nix-darwin environment
  programs.zsh.enable = true;

  # Enable direnv
  programs.direnv = {
    enable = true;
    silent = true;
    nix-direnv.enable = true;
  };

  # Set Git commit hash for darwin-version.
  system.configurationRevision = self.rev or self.dirtyRev or null;

  # Used for backwards compatibility, please read the changelog before changing.
  # $ darwin-rebuild changelog
  system.stateVersion = 4;

  # The platform the configuration will be used on.
  nixpkgs.hostPlatform = "aarch64-darwin";
}
