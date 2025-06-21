let
  mini = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIvyi+qXHCwmIoSWJaYuSob7yBvd3/cvjsmR7FR7dY9r";
  macm1 = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICt5B0ii5kBDsbx7lF3pHcoMI5fBDUDIU67/tE2tdSYL";
  systems = [ mini macm1 ];

  macm1-juan = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKL4qfJmDIiV9DBSdua91qsfbOGEnjSBR4AZkFpT6Bqt";
  users = [ macm1-juan ];

  all = systems ++ users;
in
{
  "grafana-admin-password.age".publicKeys = all;
  "macm1-syncthing-cert.age".publicKeys = all;
  "macm1-syncthing-key.age".publicKeys = all;
}
