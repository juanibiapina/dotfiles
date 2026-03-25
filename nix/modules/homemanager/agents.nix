{ config, inputs, ... }:

let
  homeDir = config.home.homeDirectory;
  dotfilesSkills = "${homeDir}/workspace/juanibiapina/dotfiles/dotfiles/agents/.agents/skills";

  # Own skills: live symlinks (edit in dotfiles, see changes instantly)
  ownSkillDirs = builtins.attrNames (
    builtins.readDir ../../../dotfiles/agents/.agents/skills
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

  # Third-party: single-skill repos (SKILL.md at root)
  singleRepoSkills = builtins.listToAttrs (map (name: {
    name = ".agents/skills/${name}";
    value.source = "${inputs.last30days-skill}";
  }) [ "last30days" ]);

  externalSkills = slavingiaSkills // superpowersSkills // impeccableSkills // singleRepoSkills;
in {
  home.file = ownSkills // externalSkills;
}
