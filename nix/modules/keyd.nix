{ ... }:

{
  services.keyd = {
    enable = true;
    keyboards.default.settings = {
      main = {
        capslock = "overload(control, esc)";
        leftalt = "leftmeta";
        leftmeta = "leftalt";
      };
    };
  };
}
