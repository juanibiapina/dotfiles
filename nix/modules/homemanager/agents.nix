{ config, inputs, ... }:

let
  homeDir = config.home.homeDirectory;
in

{
  imports = [ ./agent-skills.nix ];

  modules.agent-skills = {
    enable = true;

    ownSkillsDir = ../../../skills;
    ownSkillsRuntimeDir = "${homeDir}/workspace/juanibiapina/dotfiles/skills";

    sources = {
      slavingia     = { src = inputs.slavingia-skills;    subdir = "skills"; };
      superpowers   = { src = inputs.superpowers-skills;  subdir = "skills"; };
      impeccable    = { src = inputs.impeccable-skills;   subdir = ".agents/skills"; };
      shadcn        = { src = inputs.shadcn-ui-skills;    subdir = "skills"; };
      cloudflare    = { src = inputs.cloudflare-skill;    subdir = "skills"; };
      last30days    = { src = inputs.last30days-skill; };
      agent-library = {
        src = inputs.agent-skills-library;
        subdir = "skills";
        pick = [
          "design/radix-ui-design-system"
          "business/seo-audit"
          "business/seo-geo-optimize"
          "business/seo-content-writer"
          "business/seo-keyword-strategist"
          "business/seo-forensic-incident-response"
          "business/programmatic-seo"
        ];
      };
    };
  };
}
