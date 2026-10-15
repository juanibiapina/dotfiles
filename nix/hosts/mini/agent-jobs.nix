{
  modules.agent-jobs.jobs.feedo = {
    calendar = [ "Mon..Fri 09:00 America/New_York" ];
    persistent = true;
    cwd = "/home/juan/workspace/juanibiapina/feedo";
    promptFile = "prompts/daily.md";
    pull = true;
  };
}
