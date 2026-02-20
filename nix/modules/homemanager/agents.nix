{ config, ... }:

{
  home.file.".agents".source = config.lib.file.mkOutOfStoreSymlink
    "${config.home.homeDirectory}/workspace/juanibiapina/dotfiles/dotfiles/agents/.agents";

}
