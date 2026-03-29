{ config, lib, ... }:

with lib;

let
  cfg = config.modules.agent-skills;

  homeDir = config.home.homeDirectory;

  sourceType = types.submodule {
    options = {
      src = mkOption {
        type = types.path;
        description = "Path to the skill source (typically a flake input).";
      };

      subdir = mkOption {
        type = types.nullOr types.str;
        default = null;
        description = ''
          Subdirectory containing skills. When set, discovers all skill
          directories under src/subdir. When null, treats the entire
          source as a single skill named after the attribute key.
        '';
      };

      pick = mkOption {
        type = types.nullOr (types.listOf types.str);
        default = null;
        description = ''
          Cherry-pick specific skills by relative path under subdir.
          When null, all discovered skills are installed.
          The installed skill name is the last path component.
        '';
      };
    };
  };

  # Discover skill directories from a source with subdir (no pick).
  # Returns: [{ name = "skill-name"; source = /nix/store/...; }]
  discoverAll = sourceName: src: subdir:
    let
      entries = builtins.readDir "${src}/${subdir}";
      dirs = attrNames (filterAttrs (_: type: type == "directory") entries);
    in map (name: {
      inherit name;
      source = "${src}/${subdir}/${name}";
      origin = sourceName;
    }) dirs;

  # Cherry-pick specific skills from a source.
  # Each pick entry is a relative path under subdir; installed name is the leaf.
  pickSkills = sourceName: src: subdir: picks:
    map (rel:
      let parts = splitString "/" rel;
      in {
        name = last parts;
        source = "${src}/${subdir}/${rel}";
        origin = sourceName;
      }
    ) picks;

  # Single-skill source (no subdir): the whole source is one skill.
  singleSkill = sourceName: src: [{
    name = sourceName;
    source = "${src}";
    origin = sourceName;
  }];

  # Resolve a source config to a list of skill entries.
  resolveSource = sourceName: sourceCfg:
    if sourceCfg.subdir == null then
      singleSkill sourceName sourceCfg.src
    else if sourceCfg.pick != null then
      pickSkills sourceName sourceCfg.src sourceCfg.subdir sourceCfg.pick
    else
      discoverAll sourceName sourceCfg.src sourceCfg.subdir;

  # Collect all third-party skills with collision detection.
  allExternalSkills =
    let
      perSource = mapAttrsToList resolveSource cfg.sources;
      flat = concatLists perSource;
    in foldl' (acc: skill:
      if acc ? ${skill.name} then
        throw "agent-skills: duplicate skill '${skill.name}' from source '${skill.origin}' conflicts with source '${acc.${skill.name}.origin}'"
      else
        acc // { ${skill.name} = skill; }
    ) {} flat;

  externalHomeFiles = mapAttrs' (_: skill: {
    name = ".agents/skills/${skill.name}";
    value.source = skill.source;
  }) allExternalSkills;

  # Own skills: live symlinks for instant editing.
  ownSkillEntries =
    if cfg.ownSkillsDir == null then {}
    else
      let
        entries = builtins.readDir cfg.ownSkillsDir;
        dirs = attrNames (filterAttrs (_: type: type == "directory") entries);
        ownPath = cfg.ownSkillsRuntimeDir;
      in builtins.listToAttrs (map (name: {
        name = ".agents/skills/${name}";
        value.source = config.lib.file.mkOutOfStoreSymlink "${ownPath}/${name}";
      }) dirs);

  # Check for collisions between own and external skills.
  ownNames = attrNames (
    if cfg.ownSkillsDir == null then {}
    else filterAttrs (_: type: type == "directory") (builtins.readDir cfg.ownSkillsDir)
  );

  externalCollisions = filter (name: allExternalSkills ? ${name}) ownNames;

in {
  options.modules.agent-skills = {
    enable = mkEnableOption "Declarative agent skills management";

    ownSkillsDir = mkOption {
      type = types.nullOr types.path;
      default = null;
      description = "Local directory containing own skills (used at build time for discovery).";
    };

    ownSkillsRuntimeDir = mkOption {
      type = types.nullOr types.str;
      default = null;
      description = "Runtime path for own skills symlinks (mkOutOfStoreSymlink target). Must resolve on the target machine.";
    };

    sources = mkOption {
      type = types.attrsOf sourceType;
      default = {};
      description = "Third-party skill sources.";
    };
  };

  config = mkIf cfg.enable {
    assertions = [{
      assertion = externalCollisions == [];
      message = "agent-skills: own skills collide with external skills: ${concatStringsSep ", " externalCollisions}";
    }];

    # Own skills override external on collision (assertion above prevents this,
    # but ownSkillEntries // externalHomeFiles would give external priority).
    # We want own skills to win, so they go second.
    home.file = externalHomeFiles // ownSkillEntries;
  };
}
