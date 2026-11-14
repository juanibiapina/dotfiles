# Syncthing base configuration shared across all hosts.
# This module is used in both contexts:
# - System-level: Imported by nix/hosts/mini/modules/syncthing-server.nix (NixOS)
# - Home Manager: Imported by macm1/home-manager.nix and mb5p/home-manager.nix (macOS), and by
#   hetzner/home-manager.nix, which keeps only the passwords folder

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
        mb5p = {
          id = "XATQKQY-BBYADGS-YKIFME4-QVME4QX-333BDKP-YJTT2TP-FGVVC2G-M2ZZAAU";
        };
        hetzner = {
          id = "GHASXVK-QSCI2K5-36HJMSZ-A7HP37T-3XV4PS5-D2UFBZO-CZUMSOO-N3O5VAK";
        };
      };

      folders = {
        secrets = {
          path = "~/Sync/secrets";
          devices = [ "mini" "macm1" "mb5p" ];
        };

        notes = {
          path = "~/Sync/notes";
          devices = [ "mini" "macm1" "mb5p" ];
        };

        passwords = {
          path = "~/Sync/passwords";
          devices = [ "mini" "macm1" "mb5p" "hetzner" ];
        };

        dropbox = {
          path = "~/Sync/Dropbox";
          devices = [ "mini" "macm1" "mb5p" ];
        };

        pi-sessions = {
          path = "~/Sync/pi-sessions";
          devices = [ "mini" "macm1" "mb5p" ];
        };

        moonlander = {
          path = "~/Sync/moonlander";
          devices = [ "mini" "macm1" "mb5p" ];
        };
      };
    };
  };
}
