{ config, inputs, ... }:

let
  homeDir = config.home.homeDirectory;
in

{
  imports = [ ./agent-skills.nix ];

  modules.agent-skills = {
    enable = true;

    ownSkillsDir = ../../../agents/skills;
    ownSkillsRuntimeDir = "${homeDir}/workspace/juanibiapina/dotfiles/agents/skills";

    mirrorDirs = {
      claude-code = ".claude/skills";
    };

    sources = {
      shadcn = {
        src = inputs.shadcn-ui-skills;
        subdir = "skills";
        pick = [ "shadcn" ];
      };
      cloudflare = {
        src = inputs.cloudflare-skill;
        subdir = "skills";
        pick = [ "cloudflare" ];
      };
      caveman = {
        src = inputs.caveman-skill;
        subdir = "skills";
        pick = [
          "caveman"
        ];
      };
      gws-cli = {
        src = inputs.gws;
        subdir = "skills";
        pick = [
          "gws-shared"
          "gws-gmail"
          "gws-gmail-read"
          "gws-gmail-send"
          "gws-gmail-triage"
          "gws-drive"
          "gws-calendar"
          "gws-sheets"
        ];
      };
    };
  };
}
