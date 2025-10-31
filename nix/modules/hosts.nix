{ ... }:

{
  # Configure /etc/hosts
  # This is also used by adguard to provide DNS responses in
  # the home network
  networking.hosts = {
    "192.168.100.1" = [ "modem.home.arpa" ];
    "192.168.188.1" = [ "fritz.home.arpa" ];
    "192.168.188.30" = [ "mini.home.arpa" ];
  };
}
