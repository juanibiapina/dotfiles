cwd=""
prompt_file=""
model=""
thinking=""
pull=0
extensions=0
gate=""

while [ $# -gt 0 ]; do
  case "$1" in
    --cwd) cwd="$2"; shift 2 ;;
    --prompt-file) prompt_file="$2"; shift 2 ;;
    --model) model="$2"; shift 2 ;;
    --thinking) thinking="$2"; shift 2 ;;
    --pull) pull=1; shift ;;
    --extensions) extensions=1; shift ;;
    --gate) gate="$2"; shift 2 ;;
    *) echo "agent-job: unknown argument: $1" >&2; exit 2 ;;
  esac
done

if [ -z "$cwd" ] || [ -z "$prompt_file" ] || [ -z "$model" ] || [ -z "$thinking" ]; then
  echo "usage: agent-job --cwd <dir> --prompt-file <path> --model <model> --thinking <level> [--pull] [--extensions] [--gate <path>]" >&2
  exit 2
fi

cd "$cwd"

# A failed update, such as a GitHub outage or a checkout without an upstream,
# leaves the checked-out prompt, which is still worth running.
if [ "$pull" = 1 ] && ! { git fetch --quiet && git merge --ff-only --quiet '@{upstream}'; }; then
  echo "agent-job: could not update $cwd; running the checked-out version" >&2
fi

if [ ! -f "$prompt_file" ]; then
  echo "agent-job: prompt file not found: $cwd/$prompt_file" >&2
  exit 1
fi

if [ -n "$gate" ] && ! "./$gate"; then
  echo "agent-job: $gate found nothing to do"
  exit 0
fi

if [ "$extensions" = 1 ]; then
  extension_args=()
else
  extension_args=(--no-extensions -e "$HOME/.pi/agent/extensions/custom-compaction.ts")
fi

exec pi -p \
  "${extension_args[@]}" \
  --model "$model" \
  --thinking "$thinking" \
  "$(cat "$prompt_file")"
