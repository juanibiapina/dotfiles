START_TIME=0
IGNORE_TIME_TRACKING="yes"
CURRENT_COMMAND="?"

if [ -z "$TIME_TO_NOTIFY" ]; then
  TIME_TO_NOTIFY=60
fi

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
  local xx
  if [ -n "$TTY" ]; then
    if [ -z "$IGNORE_TIME_TRACKING" ]; then
      IGNORE_TIME_TRACKING="yes"
      xx=$(($SECONDS-$START_TIME))
      if [ "$xx" -gt "$TIME_TO_NOTIFY" ]; then
        if [ -n "$(declare -f report_time)" ]; then
          report_time "$xx" "$CURRENT_COMMAND"
        fi
      fi
    fi
  fi
}

precmd_functions+=(time-tracker-precmd)
preexec_functions+=(time-tracker-preexec)
