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

  # Third-party: multi-skill repos (skills/<name>/ layout)
  slavingiaSkillNames = builtins.attrNames (
    builtins.readDir "${inputs.slavingia-skills}/skills"
  );

  multiRepoSkills = builtins.listToAttrs (map (name: {
    inherit name;
    value = "${inputs.slavingia-skills}/skills/${name}";
  }) slavingiaSkillNames);

  # Third-party: single-skill repos (SKILL.md at root)
  singleRepoSkills = {
    "last30days" = "${inputs.last30days-skill}";
  };

  allExternalSkills = multiRepoSkills // singleRepoSkills;

  externalSkills = builtins.listToAttrs (map (name: {
    name = ".agents/skills/${name}";
    value.source = allExternalSkills.${name};
  }) (builtins.attrNames allExternalSkills));
in {
  home.file = ownSkills // externalSkills;
}
