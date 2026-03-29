{ config, inputs, pkgs, ... }:

let
  homeDir = config.home.homeDirectory;
  dotfilesSkills = "${homeDir}/workspace/juanibiapina/dotfiles/skills";

  # Own skills: live symlinks (edit in repo, see changes instantly)
  ownSkillDirs = builtins.attrNames (
    builtins.readDir ../../../skills
  );

  ownSkills = builtins.listToAttrs (map (name: {
    name = ".agents/skills/${name}";
    value.source = config.lib.file.mkOutOfStoreSymlink "${dotfilesSkills}/${name}";
  }) ownSkillDirs);

  # Third-party: slavingia/skills (flat: skills/<name>/)
  slavingiaSkillNames = builtins.attrNames (
    builtins.readDir "${inputs.slavingia-skills}/skills"
  );

  slavingiaSkills = builtins.listToAttrs (map (name: {
    name = ".agents/skills/${name}";
    value.source = "${inputs.slavingia-skills}/skills/${name}";
  }) slavingiaSkillNames);

  # Third-party: obra/superpowers (flat: skills/<name>/)
  superpowersSkillNames = builtins.attrNames (
    builtins.readDir "${inputs.superpowers-skills}/skills"
  );

  superpowersSkills = builtins.listToAttrs (map (name: {
    name = ".agents/skills/${name}";
    value.source = "${inputs.superpowers-skills}/skills/${name}";
  }) superpowersSkillNames);

  # Third-party: pbakaus/impeccable (flat: .agents/skills/<name>/)
  impeccableSkillNames = builtins.attrNames (
    builtins.readDir "${inputs.impeccable-skills}/.agents/skills"
  );

  impeccableSkills = builtins.listToAttrs (map (name: {
    name = ".agents/skills/${name}";
    value.source = "${inputs.impeccable-skills}/.agents/skills/${name}";
  }) impeccableSkillNames);

  # Third-party: shadcn-ui/ui (skills/<name>/)
  shadcnSkillNames = builtins.attrNames (
    builtins.readDir "${inputs.shadcn-ui-skills}/skills"
  );

  shadcnSkills = builtins.listToAttrs (map (name: {
    name = ".agents/skills/${name}";
    value.source = "${inputs.shadcn-ui-skills}/skills/${name}";
  }) shadcnSkillNames);

  # Third-party: single-skill repos (SKILL.md at root)
  singleRepoSkills = builtins.listToAttrs (map (name: {
    name = ".agents/skills/${name}";
    value.source = "${inputs.last30days-skill}";
  }) [ "last30days" ]);

  # Third-party: TechNomadCode/AI-Product-Development-Toolkit
  # This repo has prompt templates without SKILL.md files. We build wrapper
  # derivations that combine a generated SKILL.md with the original content.
  mkSkillMd = name: description: body:
    "---\nname: ${name}\ndescription: ${description}\n---\n\n${body}\n";

  mkToolkitSkill = name: { dir, description, body }:
    let
      content = mkSkillMd name description (builtins.concatStringsSep "\n" body);
      skillMd = pkgs.writeText "SKILL-${name}.md" content;
    in pkgs.runCommandLocal "hm_${builtins.replaceStrings ["-"] [""] name}" {} ''
      mkdir -p $out
      cp -r ${inputs.ai-product-toolkit}/${dir}/* $out/
      cp ${skillMd} $out/SKILL.md
    '';

  toolkitSkillDefs = {
    prd-creation = {
      dir = "PRD";
      description = "Create a Product Requirements Document through guided questioning. Use when starting a new product, defining requirements, or creating a PRD.";
      body = [
        "# PRD Creation"
        ""
        "Guide the user through creating a Product Requirements Document using an interactive, question-driven process."
        ""
        "Read `Guided-PRD-Creation.md` in this directory and follow the ROLE, GOAL, and PROCESS instructions. The user provides a brain dump of ideas; iteratively ask clarifying questions to build a structured PRD."
        ""
        "Part of the [AI Product Development Toolkit](https://github.com/TechNomadCode/AI-Product-Development-Toolkit) workflow:"
        "PRD (this) > UX User Flow > MVP Concept > MVP Planning > Testing > v0 Design"
      ];
    };

    ux-user-flow = {
      dir = "UX-User-Flow";
      description = "Create UX specifications, user flows, and interaction patterns from a PRD. Use when designing user experience, screen layouts, or creating UX specs.";
      body = [
        "# UX User Flow"
        ""
        "Translate a Product Requirements Document into detailed UX specifications, user flows, screen layouts, and interaction patterns."
        ""
        "Read `Guided-UX-User-Flow.md` in this directory and follow the ROLE, GOAL, and PROCESS instructions. Requires a PRD as input."
        ""
        "Part of the [AI Product Development Toolkit](https://github.com/TechNomadCode/AI-Product-Development-Toolkit) workflow:"
        "PRD > UX User Flow (this) > MVP Concept > MVP Planning > Testing > v0 Design"
      ];
    };

    mvp-concept = {
      dir = "MVP-Concept";
      description = "Define a focused MVP concept with hypothesis, target users, and minimum feature set. Use when scoping an MVP or defining what to build first.";
      body = [
        "# MVP Concept Definition"
        ""
        "Define a focused MVP concept: hypothesis to test, target early adopters, core problem, and absolute minimum feature set."
        ""
        "Read `Guided-MVP-Concept-Definition.md` in this directory and follow the ROLE, GOAL, and PROCESS instructions. Requires a PRD as input; optionally uses UX specifications."
        ""
        "Part of the [AI Product Development Toolkit](https://github.com/TechNomadCode/AI-Product-Development-Toolkit) workflow:"
        "PRD > UX User Flow > MVP Concept (this) > MVP Planning > Testing > v0 Design"
      ];
    };

    mvp-planning = {
      dir = "MVP";
      description = "Create an MVP development plan with timeline, resources, and success metrics. Use when planning MVP development or creating a build plan.";
      body = [
        "# MVP Development Planning"
        ""
        "Create a comprehensive MVP development plan covering strategy, scope, timeline, resources, and success metrics."
        ""
        "Read `Guided-MVP.md` in this directory and follow the ROLE, GOAL, and PROCESS instructions. Requires a PRD and MVP concept description as input."
        ""
        "Part of the [AI Product Development Toolkit](https://github.com/TechNomadCode/AI-Product-Development-Toolkit) workflow:"
        "PRD > UX User Flow > MVP Concept > MVP Planning (this) > Testing > v0 Design"
      ];
    };

    ultra-lean-mvp = {
      dir = "Ultra-Lean-MVP";
      description = "Rapidly define a core MVP build specification with the simplest implementation path. Use when asked for a lean or rapid MVP spec.";
      body = [
        "# Ultra-Lean MVP"
        ""
        "Rapidly define a core MVP build specification focused on essential features and the simplest, fastest implementation path."
        ""
        "Read `Guided-Ultra-Lean-MVP.md` in this directory and follow the ROLE, GOAL, and PROCESS instructions. Requires a PRD as input. Alternative to the more detailed MVP Planning skill."
        ""
        "Part of the [AI Product Development Toolkit](https://github.com/TechNomadCode/AI-Product-Development-Toolkit) workflow:"
        "PRD > UX User Flow > MVP Concept > Ultra-Lean MVP (this, alternative to MVP Planning) > Testing > v0 Design"
      ];
    };

    test-planning = {
      dir = "Testing";
      description = "Create a structured test plan with scope, approach, and schedule. Use when planning testing, QA strategy, or creating a test plan.";
      body = [
        "# Test Planning"
        ""
        "Create a structured test plan defining scope, approach, resources, and schedule for testing activities."
        ""
        "Read `Guided-Test-Plan.md` in this directory and follow the ROLE, GOAL, and PROCESS instructions."
        ""
        "Part of the [AI Product Development Toolkit](https://github.com/TechNomadCode/AI-Product-Development-Toolkit) workflow:"
        "PRD > UX User Flow > MVP Concept > MVP Planning > Testing (this) > v0 Design"
      ];
    };

    v0-design = {
      dir = "v0-Design";
      description = "Generate v0.dev prompts for visual frontend code from UX specs and MVP scope. Use when creating v0.dev prompts or visual design specifications.";
      body = [
        "# v0 Design Prompt Generation"
        ""
        "Generate detailed v0.dev prompts for visual frontend code based on UX specifications and MVP scope."
        ""
        "Read `v0.dev-visual-generation-prompt-filler.md` for the guided process and `v0.dev-visual-generation-prompt.md` for the target template. Follow the ROLE, GOAL, and PROCESS instructions in the filler document."
        ""
        "Part of the [AI Product Development Toolkit](https://github.com/TechNomadCode/AI-Product-Development-Toolkit) workflow:"
        "PRD > UX User Flow > MVP Concept > MVP Planning > Testing > v0 Design (this)"
      ];
    };
  };

  toolkitSkills = builtins.listToAttrs (map (name: {
    name = ".agents/skills/${name}";
    value.source = mkToolkitSkill name toolkitSkillDefs.${name};
  }) (builtins.attrNames toolkitSkillDefs));

  # Third-party: dmmulroy/cloudflare-skill (flat: skills/<name>/)
  cloudflareSkillNames = builtins.attrNames (
    builtins.readDir "${inputs.cloudflare-skill}/skills"
  );

  cloudflareSkills = builtins.listToAttrs (map (name: {
    name = ".agents/skills/${name}";
    value.source = "${inputs.cloudflare-skill}/skills/${name}";
  }) cloudflareSkillNames);

  # Third-party: christophacham/agent-skills-library (nested: skills/design/<name>/)
  agentSkillsLibrarySkills = {
    ".agents/skills/radix-ui-design-system".source = "${inputs.agent-skills-library}/skills/design/radix-ui-design-system";
    ".agents/skills/seo-audit".source = "${inputs.agent-skills-library}/skills/business/seo-audit";
    ".agents/skills/seo-geo-optimize".source = "${inputs.agent-skills-library}/skills/business/seo-geo-optimize";
    ".agents/skills/seo-content-writer".source = "${inputs.agent-skills-library}/skills/business/seo-content-writer";
    ".agents/skills/seo-keyword-strategist".source = "${inputs.agent-skills-library}/skills/business/seo-keyword-strategist";
    ".agents/skills/seo-forensic-incident-response".source = "${inputs.agent-skills-library}/skills/business/seo-forensic-incident-response";
    ".agents/skills/programmatic-seo".source = "${inputs.agent-skills-library}/skills/business/programmatic-seo";
  };

  externalSkills = slavingiaSkills // superpowersSkills // impeccableSkills // shadcnSkills // singleRepoSkills // toolkitSkills // agentSkillsLibrarySkills // cloudflareSkills;
in {
  home.file = ownSkills // externalSkills;
}
