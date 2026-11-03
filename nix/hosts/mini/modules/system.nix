{ ... }:

{
  imports = [ ../../../modules/nixos/system.nix ];

  # Boot loader
  boot.loader.systemd-boot.enable = true;
  boot.loader.systemd-boot.consoleMode = "max";
  boot.loader.efi.canTouchEfiVariables = true;
  # Enable netboot.xyz entry in systemd-boot
  boot.loader.systemd-boot.netbootxyz.enable = true;
  # Enable zfs during boot
  boot.supportedFilesystems = ["zfs"];

  # Add certificates
  security.pki.certificates = [
  ''
    -----BEGIN CERTIFICATE-----
    MIIBpDCCAUqgAwIBAgIRANWqZHwqnqAxWF+MS7iCU48wCgYIKoZIzj0EAwIwMDEu
    MCwGA1UEAxMlQ2FkZHkgTG9jYWwgQXV0aG9yaXR5IC0gMjAyNCBFQ0MgUm9vdDAe
    Fw0yNDA1MjQyMzQwNTlaFw0zNDA0MDIyMzQwNTlaMDAxLjAsBgNVBAMTJUNhZGR5
    IExvY2FsIEF1dGhvcml0eSAtIDIwMjQgRUNDIFJvb3QwWTATBgcqhkjOPQIBBggq
    hkjOPQMBBwNCAATpsEPGh82ZcviySAycgHB0RuDVbNbCPs9qyHD604k3PaF9xr5J
    B5PCkCnjtnxz1XRWHVcDLCPWess6du/JQt5oo0UwQzAOBgNVHQ8BAf8EBAMCAQYw
    EgYDVR0TAQH/BAgwBgEB/wIBATAdBgNVHQ4EFgQU7fzebtTYvDw/fPurXrWvHOUc
    FdgwCgYIKoZIzj0EAwIDSAAwRQIgE+p0qhdBbdO/81aH6McjHK8kh7JNIyaB8EB4
    ue8EieECIQC4JGOodCDQLunq6A0lxIRNxtZ1KrnG+qmp3kOmozSS+Q==
    -----END CERTIFICATE-----
  ''
  ];

  # Configure ssh aliases
  programs.ssh.extraConfig = ''
    Host mini
      User juan
      HostName mini.home.arpa
  '';
}
