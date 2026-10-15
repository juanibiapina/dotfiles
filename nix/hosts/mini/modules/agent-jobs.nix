{ config, lib, pkgs, ... }:
with lib;
let
  cfg = config.modules.agent-jobs;

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
    ] ++ optional job.pull "--pull")}
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
    }) cfg.jobs;

    systemd.timers = mapAttrs' (name: job: nameValuePair "agent-job-${name}" {
      description = "Schedule for agent job ${name}";
      wantedBy = [ "timers.target" ];
      timerConfig = {
        OnCalendar = job.calendar;
        Persistent = job.persistent;
      };
    }) (filterAttrs (_: job: job.calendar != [ ]) cfg.jobs);
  };
}
