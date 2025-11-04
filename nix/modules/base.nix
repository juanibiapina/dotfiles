# base module shared by all hosts
{
  config = {
    nix.settings = {
      substituters = [
        "https://nix-community.cachix.org"
      ];
      trusted-public-keys = [
        "nix-community.cachix.org-1:mB9FSh9qf2dCimDSUo8Zy7bkq5CX+/rkCWyvRCYg3Fs="
      ];
    };

    # Enable the OpenSSH daemon.
    # On darwin this enables Apple's built-in OpenSSH server.
    # To generates the SSH host keys in /etc/ssh, run `ssh localhost` once.
    services.openssh.enable = true;
  };
}
