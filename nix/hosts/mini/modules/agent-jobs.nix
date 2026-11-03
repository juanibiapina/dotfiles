{ config, lib, pkgs, ... }:
with lib;
let
  cfg = config.modules.agent-jobs;
  systemJobs = filterAttrs (_: job: !job.user) cfg.jobs;
  userJobs = filterAttrs (_: job: job.user) cfg.jobs;

  timer = name: job: {
    description = "Schedule for agent job ${name}";
    wantedBy = [ "timers.target" ];
    timerConfig = {
      OnCalendar = job.calendar;
      Persistent = job.persistent;
    };
  };

  runner = pkgs.writeShellApplication {
    name = "agent-job";
    runtimeInputs = [ pkgs.git pkgs.coreutils ];
    text = builtins.readFile ./agent-job.bash;
  };

  jobScript = name: job: pkgs.writeText "agent-job-${name}.zsh" ''
    exec ${runner}/bin/agent-job ${escapeShellArgs ([
      "--cwd" job.cwd
      "--prompt-file" job.promptFile
      "--model" job.model
      "--thinking" job.thinking
    ] ++ optional job.pull "--pull" ++ optional job.extensions "--extensions"
      ++ optionals (job.gate != null) [ "--gate" job.gate ])}
  '';

  jobOptions = {
    options = {
      calendar = mkOption {
        type = types.listOf types.str;
        default = [ ];
        description = "systemd OnCalendar expressions. An empty list creates no timer, so the job only runs when started by hand.";
      };
      persistent = mkOption {
        type = types.bool;
        default = false;
        description = "Run a missed schedule at the next boot.";
      };
      cwd = mkOption {
        type = types.str;
        description = "Working directory of the agent.";
      };
      promptFile = mkOption {
        type = types.str;
        description = "Prompt file, relative to cwd, read at run time.";
      };
      pull = mkOption {
        type = types.bool;
        default = false;
        description = "Fast-forward cwd to its upstream branch before reading the prompt.";
      };
      model = mkOption {
        type = types.str;
        default = "anthropic/claude-sonnet-5-5";
      };
      thinking = mkOption {
        type = types.str;
        default = "medium";
      };
      extensions = mkOption {
        type = types.bool;
        default = false;
        description = "Load pi's extensions, which the Zero MCP and other MCP tools need. Without it, pi runs with only custom-compaction.";
      };
      gate = mkOption {
        type = types.nullOr types.str;
        default = null;
        description = "Executable, relative to cwd, run before the agent. The agent runs only when it exits 0, so a job can skip the model when it has no work.";
      };
      user = mkOption {
        type = types.bool;
        default = false;
        description = "Run as a user unit of juan instead of a system service, so the job can reach herdr-core (hc).";
      };
      timeout = mkOption {
        type = types.str;
        default = "2h";
        description = "TimeoutStartSec of the job's service.";
      };
    };
  };
in
{
  options.modules.agent-jobs.jobs = mkOption {
    type = types.attrsOf (types.submodule jobOptions);
    default = { };
    description = "Scheduled headless pi jobs, run as juan.";
  };

  config = mkIf (cfg.jobs != { }) {
    environment.systemPackages = [ runner ];

    systemd.services = mapAttrs' (name: job: nameValuePair "agent-job-${name}" {
      description = "Agent job ${name}";
      after = [ "network-online.target" ];
      wants = [ "network-online.target" ];
      restartIfChanged = false;
      serviceConfig = {
        Type = "oneshot";
        User = "juan";
        Group = "users";
        TimeoutStartSec = job.timeout;
        ExecStart = "${getExe pkgs.zsh} -l -i ${jobScript name job}";
      };
    }) systemJobs;

    systemd.timers = mapAttrs' (name: job: nameValuePair "agent-job-${name}" (timer name job))
      (filterAttrs (_: job: job.calendar != [ ]) systemJobs);

    systemd.user.services = mapAttrs' (name: job: nameValuePair "agent-job-${name}" {
      description = "Agent job ${name}";
      after = [ "herdr-core.service" ];
      restartIfChanged = false;
      unitConfig.ConditionUser = "juan";
      serviceConfig = {
        Type = "oneshot";
        TimeoutStartSec = job.timeout;
        ExecStart = "${getExe pkgs.zsh} -l -i ${jobScript name job}";
      };
    }) userJobs;

    systemd.user.timers = mapAttrs' (name: job: nameValuePair "agent-job-${name}" (timer name job))
      (filterAttrs (_: job: job.calendar != [ ]) userJobs);
  };
}
