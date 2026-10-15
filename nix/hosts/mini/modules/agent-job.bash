cwd=""
prompt_file=""
model=""
thinking=""
pull=0

while [ $# -gt 0 ]; do
  case "$1" in
    --cwd) cwd="$2"; shift 2 ;;
    --prompt-file) prompt_file="$2"; shift 2 ;;
    --model) model="$2"; shift 2 ;;
    --thinking) thinking="$2"; shift 2 ;;
    --pull) pull=1; shift ;;
    *) echo "agent-job: unknown argument: $1" >&2; exit 2 ;;
  esac
done

if [ -z "$cwd" ] || [ -z "$prompt_file" ] || [ -z "$model" ] || [ -z "$thinking" ]; then
  echo "usage: agent-job --cwd <dir> --prompt-file <path> --model <model> --thinking <level> [--pull]" >&2
  exit 2
fi

cd "$cwd"

if [ "$pull" = 1 ]; then
  git fetch --quiet
  git merge --ff-only --quiet '@{upstream}'
fi

if [ ! -f "$prompt_file" ]; then
  echo "agent-job: prompt file not found: $cwd/$prompt_file" >&2
  exit 1
fi

exec pi -p \
  --no-extensions \
  -e "$HOME/.pi/agent/extensions/custom-compaction.ts" \
  --model "$model" \
  --thinking "$thinking" \
  "$(cat "$prompt_file")"
