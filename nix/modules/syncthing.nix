# Syncthing base configuration shared across all hosts.
# This module is used in both contexts:
# - System-level: Imported by nix/hosts/mini/modules/syncthing-server.nix (NixOS)
# - Home Manager: Imported by macm1/home-manager.nix (macOS)

{
  services.syncthing = {
    enable = true;

    settings = {
      options = {
        urAccepted = -1;
      };

      devices = {
        mini = {
          id = "GH5VODQ-6LTTY7O-NEJQNYG-DTQE3L5-SL7L66X-Z6LIRPQ-QBBU44N-62BDBQU";
        };
        macm1 = {
          id = "X5NL5NB-EIQNQBT-CPPRRLW-RJH3CFT-UWPHRSI-7YX5NPY-7IE73GZ-RH2L5QZ";
        };
      };

      folders = {
        secrets = {
          path = "~/Sync/secrets";
          devices = [ "mini" "macm1" ];
        };

        notes = {
          path = "~/Sync/notes";
          devices = [ "mini" "macm1" ];
        };

        passwords = {
          path = "~/Sync/passwords";
          devices = [ "mini" "macm1" ];
        };

        dropbox = {
          path = "~/Sync/Dropbox";
          devices = [ "mini" "macm1" ];
        };

        pi-sessions = {
          path = "~/Sync/pi-sessions";
          devices = [ "mini" "macm1" ];
        };
      };
    };
  };
}
