# Public SSH keys (not secret). Single source of truth for agenix recipients
# (nix/secrets/secrets.nix) and cross-host authorized_keys.
#
# - users:   per-user login keys, added to authorized_keys on every host so any
#            host can SSH into any other host with its own existing keypair.
# - systems: per-host identity keys, used only as agenix recipients.
rec {
  users = {
    mini = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIF2qYif3WLMgZsmggdVAZ0wQ23mTArj2YX3TZOFNINRq";
    macm1 = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKL4qfJmDIiV9DBSdua91qsfbOGEnjSBR4AZkFpT6Bqt";
    macr = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIM3ls9agb41qHtfKfXrELewzEul0Gt2o2UNHgVHa1tfb";
  };

  systems = {
    mini = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIvyi+qXHCwmIoSWJaYuSob7yBvd3/cvjsmR7FR7dY9r";
    macm1 = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICt5B0ii5kBDsbx7lF3pHcoMI5fBDUDIU67/tE2tdSYL";
  };

  userList = builtins.attrValues users;
}
