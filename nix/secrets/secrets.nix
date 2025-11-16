let
  mini = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIvyi+qXHCwmIoSWJaYuSob7yBvd3/cvjsmR7FR7dY9r";
  macm1 = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICt5B0ii5kBDsbx7lF3pHcoMI5fBDUDIU67/tE2tdSYL";
  mac16 = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJYKtvy+JU3qhxSn2XXnUg88fj59GChJZjb9T32oJakc";
  systems = [ mini macm1 mac16 ];

  macm1-user = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKL4qfJmDIiV9DBSdua91qsfbOGEnjSBR4AZkFpT6Bqt";
  mac16-user = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPLfVvMfEMam5GqBjCogXtu/kaNKjiL+QKzHgHggZrNZ";
  users = [ macm1-user mac16-user ];

  all = systems ++ users;
in
{
  "grafana-admin-password.age".publicKeys = all;
  "macm1-syncthing-cert.age".publicKeys = all;
  "macm1-syncthing-key.age".publicKeys = all;
  "mac16-syncthing-cert.age".publicKeys = all;
  "mac16-syncthing-key.age".publicKeys = all;
  "gcp-oauth-keys.age".publicKeys = all;
}
