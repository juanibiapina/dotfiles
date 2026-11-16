# Checks for dev herdr snooze and snooze-candidates.
#
# snoozable <terminal>: prints the terminal's `hc get --json`, or the reason
# it can't be snoozed on stderr and returns 1: it ended, it isn't running pi,
# pi is working, or it is already snoozed.
snoozable() {
  local current
  current="$(hc get "$1" --json)" || return 1
  if [ "$(jq -r .state <<<"$current")" != "live" ]; then
    echo "$1 has ended." >&2
    return 1
  fi
  if [ "$(jq -r '.foreground.name // ""' <<<"$current")" != "pi" ]; then
    echo "$1 is not running pi." >&2
    return 1
  fi
  if [ "$(jq -r '.status.state // ""' <<<"$current")" = "working" ]; then
    echo "pi is working. Snooze it once it stops." >&2
    return 1
  fi
  if [ -n "$(jq -r '.labels["juan.snooze"] // ""' <<<"$current")" ]; then
    echo "$1 is already snoozed." >&2
    return 1
  fi
  printf '%s\n' "$current"
}

NOTHING_TO_WAIT_FOR="Nothing to wait for: send it a GitHub thread from the inbox, or open a PR on its branch."
