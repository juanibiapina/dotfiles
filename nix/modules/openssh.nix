{
  # Enable the OpenSSH daemon.
  # On darwin this enables Apple's built-in OpenSSH server.
  # This also generates the SSH host keys in /etc/ssh if they do not exist.
  # Which is needed for agenix.
  services.openssh.enable = true;
}

