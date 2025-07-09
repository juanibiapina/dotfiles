{ config, lib, ... }:

with lib;

let
  cfg = config.modules.syncthing;
in
{
  options.modules.syncthing = {
    enable = mkEnableOption "Syncthing file synchronization";
  };

  config = mkIf cfg.enable {
    services.syncthing = {
      enable = true;

      settings = {
        options = {
          urAccepted = -1;
        };

        devices = {
          desktop = {
            id = "RSLPDC6-GSD5IBK-CILWGCL-66KG7EJ-H6X4ANG-NA6UHGN-YFSDHGB-BDP2XAG";
          };
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
            devices = [ "desktop" "mini" "macm1" "mac16" ];
          };

          notes = {
            path = "~/Sync/notes";
            devices = [ "desktop" "mini" "macm1" "mac16" ];
          };

          passwords = {
            path = "~/Sync/passwords";
            devices = [ "desktop" "mini" "macm1" "mac16" ];
          };
        };
      };
    };
  };
}
