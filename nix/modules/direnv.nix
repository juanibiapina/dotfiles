{
  programs.direnv = {
    enable = true;
    silent = true;
    nix-direnv.enable = true;
    settings = {
      whitelist = {
        exact = ["~/workspace/contentful" "~/workspace/ninetailed-inc"];
      };
    };
  };
}
