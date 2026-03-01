# Syncthing base configuration shared across all hosts.
# This module is used in both contexts:
# - System-level: Imported by nix/hosts/mini/modules/syncthing-server.nix (NixOS)
# - Home Manager: Imported by macm1/home-manager.nix and mac16/home-manager.nix (macOS)

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
        mac16 = {
          id = "SLTOL4R-UE3J2AS-KJEJKSN-77TVD3X-IWGYSRE-HJHQX6Z-QXEIGCJ-IZOIFQT";
        };
        macr = {
          id = "7HLPCQJ-O67F4DE-HIL3AKA-7SJWNAA-BPL2MWY-I6GT7UQ-7ONEBDY-3EMZLQ7";
        };
      };

      folders = {
        secrets = {
          path = "~/Sync/secrets";
          devices = [ "mini" "macm1" "mac16" "macr" ];
        };

        notes = {
          path = "~/Sync/notes";
          devices = [ "mini" "macm1" "mac16" "macr" ];
        };

        passwords = {
          path = "~/Sync/passwords";
          devices = [ "mini" "macm1" "mac16" "macr" ];
        };
      };
    };
  };
}
