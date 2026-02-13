let
  mini = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIvyi+qXHCwmIoSWJaYuSob7yBvd3/cvjsmR7FR7dY9r";
  macm1 = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICt5B0ii5kBDsbx7lF3pHcoMI5fBDUDIU67/tE2tdSYL";
  mac16 = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJYKtvy+JU3qhxSn2XXnUg88fj59GChJZjb9T32oJakc";
  systems = [ mini macm1 mac16 ];

  mini-user = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIF2qYif3WLMgZsmggdVAZ0wQ23mTArj2YX3TZOFNINRq";
  macm1-user = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKL4qfJmDIiV9DBSdua91qsfbOGEnjSBR4AZkFpT6Bqt";
  mac16-user = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPLfVvMfEMam5GqBjCogXtu/kaNKjiL+QKzHgHggZrNZ";
  macr-user = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIM3ls9agb41qHtfKfXrELewzEul0Gt2o2UNHgVHa1tfb";
  users = [ mini-user macm1-user mac16-user macr-user ];

  all = systems ++ users;
in
{
  "grafana-admin-password.age".publicKeys = all;
  "macm1-syncthing-cert.age".publicKeys = all;
  "macm1-syncthing-key.age".publicKeys = all;
  "mac16-syncthing-cert.age".publicKeys = all;
  "mac16-syncthing-key.age".publicKeys = all;
  "macr-syncthing-cert.age".publicKeys = all;
  "macr-syncthing-key.age".publicKeys = all;
  "gcp-oauth-keys.age".publicKeys = all;
  "google-credentials.age".publicKeys = all;
}
