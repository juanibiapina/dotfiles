{ ... }:

{
  services.keyd = {
    enable = true;
    keyboards.default.settings = {
      main = {
        capslock = "overload(control, esc)";
        leftalt = "layer(leftmeta)";
        leftmeta = "leftalt";
      };

      "leftmeta:M" = {
        h = "left";
        j = "down";
        k = "up";
        l = "right";
        a = "home";
        e = "end";
      };
    };
  };
}
