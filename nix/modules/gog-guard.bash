refuse() {
  echo "gog guard: $1" >&2
  echo "Gmail's web composer hard-wraps plain-text drafts at about 70 characters when they are sent, so the email that goes out differs from the draft." >&2
  exit 2
}

for arg in "$@"; do
  case "$arg" in
    -h | --help) exec "$GOG_REAL" "$@" ;;
  esac
done

commands=()
has_html_body=0
skip_value=0
for arg in "$@"; do
  if [[ $skip_value == 1 ]]; then
    skip_value=0
    continue
  fi
  case "$arg" in
    --body-html | --body-html=* | --body-html-file | --body-html-file=*) has_html_body=1 ;;
  esac
  case "$arg" in
    -a | --account | --acct | --client | --home | --color | --access-token | --quota-project | --enable-commands | --enable-commands-exact | --disable-commands | --select | --fields)
      skip_value=1
      ;;
    -*) ;;
    *) commands+=("$arg") ;;
  esac
done

first="${commands[0]:-}"
second="${commands[1]:-}"
third="${commands[2]:-}"

case "$first" in
  gmail | mail | email) ;;
  *) exec "$GOG_REAL" "$@" ;;
esac

case "$second" in
  drafts | draft) ;;
  *) exec "$GOG_REAL" "$@" ;;
esac

case "$third" in
  create | add | new | update | edit | set | reply | reply-all | replyall | forward | fwd) ;;
  *) exec "$GOG_REAL" "$@" ;;
esac

if [[ $has_html_body == 0 ]]; then
  refuse "Gmail drafts must include an HTML body: add --body-html or --body-html-file (a plain --body may stay as the text alternative)."
fi

exec "$GOG_REAL" "$@"
