{ ... }:

{
  services.keyd = {
    enable = true;
    keyboards.default.settings = {
      main = {
        capslock = "overload(capslock, esc)";
        leftalt = "leftmeta";
        leftmeta = "leftalt";
      };

      "capslock:C" = {
        h = "left";
        j = "down";
        k = "up";
        l = "right";
      };
    };
  };
}
