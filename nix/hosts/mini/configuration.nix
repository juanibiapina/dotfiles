# Edit this configuration file to define what should be installed on
# your system. Help is available in the configuration.nix(5) man page, on
# https://search.nixos.org/options and in the NixOS manual (`nixos-help`).

{ pkgs, ... }:

{
  imports =
    [
      ./hardware-configuration.nix
      ../../cachix.nix
      ../../modules/hosts.nix
      ../../modules/syncthing.nix
      ../../modules/system.nix
    ];

  boot.loader.systemd-boot.configurationLimit = 2;

  networking.hostId = "1855342b";
  networking.hostName = "mini";

  nix.settings = {
    substituters = [
      "https://nix-community.cachix.org"
    ];
    trusted-public-keys = [
      "nix-community.cachix.org-1:mB9FSh9qf2dCimDSUo8Zy7bkq5CX+/rkCWyvRCYg3Fs="
    ];
  };

  # console = {
  #   font = "Lat2-Terminus16";
  #   keyMap = "us";
  #   useXkbConfig = true; # use xkb.options in tty.
  # };

  # Open ports in the firewall.
  networking.firewall.allowedTCPPorts = [ 80 443 53 3001 8123 ];
  networking.firewall.allowedUDPPorts = [ 53 ];

  # Packages
  environment.systemPackages = with pkgs; [
    wakeonlan
  ];

  # users that can interact with the nix store
  nix.settings.trusted-users = [ "root" "juan" "github-runner-mini" ];

  # Enable sharing of Nix store as a binary cache
  services.nix-serve = {
    enable = true;
    port = 3001;
    secretKeyFile = "/home/juan/Sync/secrets/mini.nix-serve.private-key.pem";
  };

  # Configure services that run on containers
  virtualisation.oci-containers = {
    backend = "podman";

    containers.homeassistant = {
      volumes = [ "home-assistant:/config" ];
      environment.TZ = "Europe/Berlin";
      image = "ghcr.io/home-assistant/home-assistant:2024.12.5"; # Warning: if the tag does not change, the image will not be updated
      extraOptions = [
        "--network=host"
        "--device=/dev/ttyUSB0:/dev/ttyUSB0"
      ];
    };
  };

  services.caddy = {
    enable = true;
    virtualHosts."juanibiapina.mywire.org".extraConfig = ''
      reverse_proxy localhost:8123
    '';
  };

  # Configure backups
  services.restic = {
    backups = {
      b2 = {
        paths = [ "/home/juan/Sync" ];
        repository = "rclone:b2-backups:juanibiapina-backups";
        rcloneConfigFile = "/home/juan/.config/rclone/rclone.conf";
        initialize = true;
        passwordFile = "/home/juan/Sync/secrets/restic-backups-password";
        timerConfig = {
          OnCalendar = "02:00";
        };
      };
    };
  };

  # Configure keys for syncthing
  services.syncthing = {
    cert = "/home/juan/Sync/secrets/mini.syncthing.cert.pem";
    key = "/home/juan/Sync/secrets/mini.syncthing.key.pem";
  };

  # Self-hosted Github Actions runner
  services.github-runners = {
    mini = {
      enable = true;
      name = "mini";
      tokenFile = "/home/juan/Sync/secrets/mini.github-runner.token";
      url = "https://github.com/juanibiapina/dotfiles";
      extraPackages = [ pkgs.cachix ];
      replace = true;
    };
  };

  # Configure auto upgrade of the system
  system.autoUpgrade = {
    enable = true;
    dates = "Mon *-*-* 03:00:00";
    allowReboot = true;
    flake = "github:juanibiapina/dotfiles";
    flags = [ "--refresh" ];
  };

  # Only upgrade system if the actual flake upgrade has successfully run on Github Actions on the same day
  systemd.services.nixos-upgrade = {
    after = [ "pre-upgrade.service" ];
    before = [ "post-upgrade.service" ];
    requires = [ "pre-upgrade.service" "post-upgrade.service" ];
    unitConfig = {
      ConditionPathExists = "/run/nixos-upgrade/should-upgrade";
    };
  };

  systemd.services.pre-upgrade = {
    description = "Check if today is the first Monday of the month and if Github upgrade build is successful";
    path = with pkgs; [ gh jq git ];
    script = ''
      # Check if today is the first Monday of the month
      today=$(date -u +"%Y-%m-%d")
      first_monday=$(date -u -d "$(date -u +%Y-%m-01) +$(( (8 - $(date -u -d "$(date -u +%Y-%m-01)" +%u)) % 7 )) days" +%Y-%m-%d)

      if [ "$today" != "$first_monday" ]; then
        echo "Not the first Monday of the month. Skipping upgrade."
        exit 0
      fi

      # Check if today's flake upgrade GitHub Actions run succeeded
      export GH_TOKEN=$(cat /home/juan/Sync/secrets/mini-github.token)
      conclusion="$(gh run list --repo juanibiapina/dotfiles --limit 1 -w "Update flake" --created "$today" --status success --json conclusion | jq -r -e '.[] | .conclusion')"

      if [ "$conclusion" != "success" ]; then
        echo "Upgrade build not successful. Skipping."
        echo "Actual conclusion: $conclusion"
        echo "This is not reported because there's already an e-mail notification when the Github action fails"
        exit 1
      fi

      # Mark upgrade as allowed
      mkdir -p /run/nixos-upgrade
      touch /run/nixos-upgrade/should-upgrade

      echo "Latest upgrade build is successful, upgrading system"
    '';
    serviceConfig = {
      Type = "oneshot";
    };
  };

  # Notify healthchecks.io after upgrade
  # This has to run within 1 minute of the upgrade otherwise the machine is rebooted
  systemd.services.post-upgrade = {
    description = "Notify healthchecks.io after upgrade";
    after = [ "nixos-upgrade.service" ];
    wants = [ "nixos-upgrade.service" ];
    unitConfig = {
      ConditionPathExists = "/run/nixos-upgrade/should-upgrade";
    };
    path = with pkgs; [ curl ];
    script = ''
      echo "Reporting to healthchecks.io"

      # get result of pre-upgrade.service
      result=$(systemctl show -p ActiveState --value pre-upgrade.service)

      # check if it ran successfully
      # oneshot units are 'inactive' after they run successfully
      if [[ "$result" != "inactive" ]]; then
        # 5 seconds timeout, retry 5 times
        curl -m 5 --retry 5 "https://hc-ping.com/$(cat /home/juan/Sync/secrets/mini.healthchecks.upgrade.uuid)/fail"

        exit 0
      fi

      # get result of nixos-upgrade.service
      result=$(systemctl show -p ActiveState --value nixos-upgrade.service)

      # check if it ran successfully
      # oneshot units are 'inactive' after they run successfully
      if [[ "$result" != "inactive" ]]; then
        # 5 seconds timeout, retry 5 times
        curl -m 5 --retry 5 "https://hc-ping.com/$(cat /home/juan/Sync/secrets/mini.healthchecks.upgrade.uuid)/fail"

        exit 0
      fi

      curl -m 5 --retry 5 "https://hc-ping.com/$(cat /home/juan/Sync/secrets/mini.healthchecks.upgrade.uuid)"
    '';
    serviceConfig = {
      Type = "oneshot";
    };
  };

  # Run garbage collection after successful upgrade
  systemd.services.post-upgrade-gc = {
    description = "Run garbage collection after successful upgrade";
    after = [ "post-upgrade.service" ];
    wants = [ "post-upgrade.service" ];
    unitConfig = {
      ConditionPathExists = "/run/nixos-upgrade/should-upgrade";
    };
    path = with pkgs; [ nix ];
    script = ''
      # Only run if post-upgrade was successful
      result=$(systemctl show -p ActiveState --value post-upgrade.service)

      # check if it ran successfully
      # oneshot units are 'inactive' after they run successfully
      if [[ "$result" != "inactive" ]]; then
        echo "post-upgrade service failed, skipping garbage collection"
        exit 0
      fi

      echo "Running garbage collection"
      nix-collect-garbage --delete-older-than 14d
    '';
    serviceConfig = {
      Type = "oneshot";
    };
  };

  # Clean up the flag file after a successful upgrade
  systemd.services.clean-upgrade-flag = {
    description = "Remove upgrade flag after system upgrade";
    after = [ "post-upgrade-gc.service" ];
    wantedBy = [ "multi-user.target" ];
    serviceConfig.Type = "oneshot";
    script = "rm -f /run/nixos-upgrade/should-upgrade";
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
