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
      impeccable    = { src = inputs.impeccable-skills;   subdir = ".agents/skills"; };
      shadcn        = { src = inputs.shadcn-ui-skills;    subdir = "skills"; };
      cloudflare    = { src = inputs.cloudflare-skill;    subdir = "skills"; };
      last30days    = { src = inputs.last30days-skill; };
      gws-cli       = {
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
      addyosmani = {
        src = inputs.addyosmani-skills;
        subdir = "skills";
        pick = [
          "api-and-interface-design"
          "browser-testing-with-devtools"
          "ci-cd-and-automation"
          "code-review-and-quality"
          "code-simplification"
          "context-engineering"
          "debugging-and-error-recovery"
          "deprecation-and-migration"
          "documentation-and-adrs"
          "frontend-ui-engineering"
          "git-workflow-and-versioning"
          "idea-refine"
          "incremental-implementation"
          "performance-optimization"
          "planning-and-task-breakdown"
          "security-and-hardening"
          "shipping-and-launch"
          "spec-driven-development"
          "test-driven-development"
          "using-agent-skills"
        ];
      };
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
