{
  services.syncthing = {
    enable = true;
    user = "juan";
    dataDir = "/home/juan/Sync";
    configDir = "/home/juan/.config/syncthing";
    openDefaultPorts = true;

    settings = {
      options = {
        urAccepted = -1;
      };

      devices = {
        "desktop" = {
          id = "RSLPDC6-GSD5IBK-CILWGCL-66KG7EJ-H6X4ANG-NA6UHGN-YFSDHGB-BDP2XAG";
        };
        "mini" = {
          id = "GH5VODQ-6LTTY7O-NEJQNYG-DTQE3L5-SL7L66X-Z6LIRPQ-QBBU44N-62BDBQU";
        };
        "pixel-juan" = {
          id = "DILKHP4-RVHVKA6-VKEIFGS-OKDH2FT-VB7JILH-I3EQMSG-G6X35BT-F72KAAV";
        };
      };

      folders = {
        "secrets" = {
          path = "/home/juan/Sync/secrets";
          devices = [ "desktop" "mini" ];
        };

        "digitalgarden" = {
          path = "/home/juan/Sync/DigitalGarden";
          devices = [ "desktop" "mini" "pixel-juan" ];
        };
      };
    };
  };
}
