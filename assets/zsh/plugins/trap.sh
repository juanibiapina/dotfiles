# Send notification on command completion after receiving SIGUSR1
TRAPUSR1() {
  command_passed=$?

  if [ $command_passed -eq 0 ]; then
    dev send-notification 0 "Zsh" "Command Passed"
  else
    dev send-notification 0 "Zsh" "Command Failed"
  fi

  return 0
}
