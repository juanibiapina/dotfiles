{ config, lib, ... }:

with lib;

let
  cfg = config.modules.jira;
in
{
  options.modules.jira = {
    enable = mkEnableOption "Jira tools";
  };

  config = mkIf cfg.enable {
    homebrew = {
      brews = [
        "jira-cli" # Command-line interface for Jira
      ];
    };
  };
}
