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

  externalSkills = slavingiaSkills // superpowersSkills // impeccableSkills // shadcnSkills // singleRepoSkills // agentSkillsLibrarySkills // cloudflareSkills;
in {
  home.file = ownSkills // externalSkills;
}
