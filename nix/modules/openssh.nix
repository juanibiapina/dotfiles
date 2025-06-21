{
  # Enable the OpenSSH daemon.
  # On darwin this enables Apple's built-in OpenSSH server.
  # To generates the SSH host keys in /etc/ssh, run `ssh localhost` once.
  services.openssh.enable = true;
}

