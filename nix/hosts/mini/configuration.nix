# Edit this configuration file to define what should be installed on
# your system. Help is available in the configuration.nix(5) man page, on
# https://search.nixos.org/options and in the NixOS manual (`nixos-help`).

{ pkgs, ... }:

{
  imports =
    [
      ./hardware-configuration.nix
      ../../cachix.nix
      ../../modules/system.nix
    ];

  networking.hostId = "1855342b";
  networking.hostName = "mini";

  # Configure /etc/hosts
  # This is also used by adguard to provide DNS responses in
  # the home network
  networking.hosts = {
    "192.168.0.1" = [ "modem.home.arpa" ];
    "192.168.188.1" = [ "fritz.home.arpa" ];
    "192.168.188.30" = [ "mini.home.arpa" ];
    "192.168.188.109" = [ "desktop.home.arpa" ];
  };

  # console = {
  #   font = "Lat2-Terminus16";
  #   keyMap = "us";
  #   useXkbConfig = true; # use xkb.options in tty.
  # };

  # Open ports in the firewall.
  networking.firewall.allowedTCPPorts = [ 80 443 53 3000 3001 3002 ];
  networking.firewall.allowedUDPPorts = [ 53 ];

  # Packages
  environment.systemPackages = with pkgs; [
    wakeonlan
  ];

  # Enable sharing of Nix store as a binary cache
  services.nix-serve = {
    enable = true;
    port = 3001;
    secretKeyFile = "/home/juan/Sync/secrets/mini.nix-serve.private-key.pem";
  };

  # Enable Home Assistant
  services.home-assistant = {
    enable = true;
    config.http.server_port = 3002;
  };

  # Enable AdGuard Home
  services.adguardhome = {
    enable = true;
    port = 3000;
    mutableSettings = false;
    # https://github.com/AdguardTeam/AdGuardHome/wiki/Configuration#configuration-file
    settings = {
      dns = {
        bind_hosts = ["0.0.0.0"];
        bootstrap_dns = ["192.168.0.1"];
        upstream_dns = ["192.168.0.1"];
        port = 53;
        hostsfile_enabled = true;
      };
    };
  };

  services.caddy = {
    enable = true;
    virtualHosts."mini.home.arpa".extraConfig = ''
      reverse_proxy localhost:8082
    '';
  };

  services.homepage-dashboard = {
    enable = true;
    listenPort = 8082;
    services = [
      {
        "Services" = [
          {
            "AdGuard Home" = {
              description = "AdGuard Home";
              href = "http://mini.home.arpa:3000";
            };
          }
          {
            "Nix Store" = {
              description = "Nix Store";
              href = "http://mini.home.arpa:3001";
            };
          }
          {
            "Home Assistant" = {
              description = "Home Assistant";
              href = "http://mini.home.arpa:3002";
            };
          }
        ];
      }
    ];
  };

  # Configure keys for syncthing
  services.syncthing = {
    cert = "/home/juan/Sync/secrets/mini.syncthing.cert.pem";
    key = "/home/juan/Sync/secrets/mini.syncthing.key.pem";
  };

  # This option defines the first version of NixOS you have installed on this particular machine,
  # and is used to maintain compatibility with application data (e.g. databases) created on older NixOS versions.
  #
  # Most users should NEVER change this value after the initial install, for any reason,
  # even if you've upgraded your system to a new NixOS release.
  #
  # This value does NOT affect the Nixpkgs version your packages and OS are pulled from,
  # so changing it will NOT upgrade your system.
  #
  # This value being lower than the current NixOS release does NOT mean your system is
  # out of date, out of support, or vulnerable.
  #
  # Do NOT change this value unless you have manually inspected all the changes it would make to your configuration,
  # and migrated your data accordingly.
  #
  # For more information, see `man configuration.nix` or https://nixos.org/manual/nixos/stable/options#opt-system.stateVersion .
  system.stateVersion = "23.11"; # Did you read the comment?
}
