START_TIME=0
IGNORE_TIME_TRACKING="yes"
CURRENT_COMMAND="?"
LAST_COMMAND_TIME=0

time-tracker-preexec()
{
  if [ -n "$TTY" ]; then
    START_TIME="$SECONDS"
    IGNORE_TIME_TRACKING=""
    CURRENT_COMMAND="$1"
    if [[ "$CURRENT_COMMAND" = vi* ]]; then
      IGNORE_TIME_TRACKING="yes"
    fi
    if [[ "$CURRENT_COMMAND" = emacs* ]]; then
      IGNORE_TIME_TRACKING="yes"
    fi
    if [[ "$CURRENT_COMMAND" = fg* ]]; then
      IGNORE_TIME_TRACKING="yes"
    fi
    if [[ "$CURRENT_COMMAND" = man* ]]; then
      IGNORE_TIME_TRACKING="yes"
    fi
  fi
}

time-tracker-precmd()
{
  if [ -n "$TTY" ]; then
    if [ -z "$IGNORE_TIME_TRACKING" ]; then
      IGNORE_TIME_TRACKING="yes"
      LAST_COMMAND_TIME=$(($SECONDS-$START_TIME))
    fi
  fi
}

precmd_functions+=(time-tracker-precmd)
preexec_functions+=(time-tracker-preexec)
