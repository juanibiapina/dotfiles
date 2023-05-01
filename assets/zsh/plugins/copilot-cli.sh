# This is taken from running `github-copilot-cli alias -- "$0"` and removing
# the absolute paths. The readme says to run `eval "$(github-copilot-cli alias -- "$0")"`
# but that adds way too much time on shell startup.
# repo: https://www.npmjs.com/package/@githubnext/github-copilot-cli

copilot_what-the-shell () {
  TMPFILE=$(mktemp);
  trap 'rm -f $TMPFILE' EXIT;
  if github-copilot-cli what-the-shell "$@" --shellout $TMPFILE; then
    if [ -e "$TMPFILE" ]; then
      FIXED_CMD=$(cat $TMPFILE);
      print -s "$FIXED_CMD";
      eval "$FIXED_CMD"
    else
      echo "Apologies! Extracting command failed"
    fi
  else
    return 1
  fi
};
alias '??'='copilot_what-the-shell';

copilot_git-assist () {
  TMPFILE=$(mktemp);
  trap 'rm -f $TMPFILE' EXIT;
  if github-copilot-cli git-assist "$@" --shellout $TMPFILE; then
    if [ -e "$TMPFILE" ]; then
      FIXED_CMD=$(cat $TMPFILE);
      print -s "$FIXED_CMD";
      eval "$FIXED_CMD"
    else
      echo "Apologies! Extracting command failed"
    fi
  else
    return 1
  fi
};
alias 'git?'='copilot_git-assist';

copilot_gh-assist () {
  TMPFILE=$(mktemp);
  trap 'rm -f $TMPFILE' EXIT;
  if github-copilot-cli gh-assist "$@" --shellout $TMPFILE; then
    if [ -e "$TMPFILE" ]; then
      FIXED_CMD=$(cat $TMPFILE);
      print -s "$FIXED_CMD";
      eval "$FIXED_CMD"
    else
      echo "Apologies! Extracting command failed"
    fi
  else
    return 1
  fi
};
alias 'gh?'='copilot_gh-assist';
alias 'wts'='copilot_what-the-shell';
