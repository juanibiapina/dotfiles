{ self, pkgs, ... }:
{
  networking.hostName = "babbel";

  # Create /etc/hosts
  environment.etc."hosts" = {
    copy = true;
    text = ''
      # Default OSX hosts file copied from original /etc/hosts
      ##
      # Host Database
      #
      # localhost is used to configure the loopback interface
      # when the system is booting.  Do not change this entry.
      ##
      127.0.0.1       localhost
      255.255.255.255 broadcasthost
      ::1             localhost

      # Custom entries
      192.168.188.30  mini.local
      192.168.188.109 desktop.local
    '';
  };

  # Configure user account
  users.users.jibiapina.home = "/Users/jibiapina";

  environment.systemPackages = with pkgs; [
    (callPackage ../../packages/nvim.nix {})
    vim
    watchexec
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
