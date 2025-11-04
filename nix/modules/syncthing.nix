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
      };

      folders = {
        secrets = {
          path = "~/Sync/secrets";
          devices = [ "mini" "macm1" "mac16" ];
        };

        notes = {
          path = "~/Sync/notes";
          devices = [ "mini" "macm1" "mac16" ];
        };

        passwords = {
          path = "~/Sync/passwords";
          devices = [ "mini" "macm1" "mac16" ];
        };
      };
    };
  };
}
