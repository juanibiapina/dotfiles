{
  modules.agent-jobs.jobs.feedo = {
    calendar = [ "Mon..Fri 09:00 America/New_York" ];
    persistent = true;
    cwd = "/home/juan/workspace/juanibiapina/feedo";
    promptFile = "prompts/daily.md";
    pull = true;
  };

  modules.agent-jobs.jobs.retro = {
    calendar = [ "*-*-* 04:00 Europe/Berlin" ];
    persistent = true;
    cwd = "/home/juan/workspace/juanibiapina/dotfiles";
    promptFile = "agents/jobs/retro.md";
    pull = true;
    thinking = "high";
  };
}
