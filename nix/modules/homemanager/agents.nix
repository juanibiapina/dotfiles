{ config, ... }:

{
  home.file.".agents".source = config.lib.file.mkOutOfStoreSymlink
    "${config.home.homeDirectory}/workspace/juanibiapina/dotfiles/dotfiles/agents/.agents";

  # Symlink opencode skills to .agents/skills so skills are shared
  home.file.".config/opencode/skills".source = config.lib.file.mkOutOfStoreSymlink
    "${config.home.homeDirectory}/workspace/juanibiapina/dotfiles/dotfiles/agents/.agents/skills";
}
