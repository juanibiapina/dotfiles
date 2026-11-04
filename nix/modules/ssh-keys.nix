# Public SSH keys (not secret). Single source of truth for agenix recipients
# (nix/secrets/secrets.nix) and cross-host authorized_keys.
#
# - users:   per-user login keys, added to authorized_keys on every host so any
#            host can SSH into any other host with its own existing keypair.
# - systems: per-host identity keys, used only as agenix recipients.
# - phones:  herdr-mobile login keys. pixel-10-pro is authorized on every host
#            through loginList; pixel-7 is a test phone authorized on mini only.
rec {
  users = {
    mini = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIF2qYif3WLMgZsmggdVAZ0wQ23mTArj2YX3TZOFNINRq";
    macm1 = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKL4qfJmDIiV9DBSdua91qsfbOGEnjSBR4AZkFpT6Bqt";
    mb5p = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIM59gDT4gfeRFtamXL56j++qWLsv8PpJyy2n4PUqihSR";
  };

  systems = {
    mini = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIvyi+qXHCwmIoSWJaYuSob7yBvd3/cvjsmR7FR7dY9r";
    macm1 = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICt5B0ii5kBDsbx7lF3pHcoMI5fBDUDIU67/tE2tdSYL";
    mb5p = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICj/KK/xpxHlwcEuFLFjk/NctknBzoffdNeUwdR5ccZF";
  };

  phones = {
    pixel-10-pro = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOTVSzvoP5vFrl5yj2EyqilTixFDRCOEJnu6CNvuI+JF herdr-mobile@Pixel-10-Pro";
    pixel-7 = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDeAPplsMxYVRGbmyiEOKY4pa33/3Xw4v0WoVbMPuUfT herdr-mobile@Pixel-7";
  };

  userList = builtins.attrValues users;
  loginList = userList ++ [ phones.pixel-10-pro ];
}
