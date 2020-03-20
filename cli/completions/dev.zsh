if [[ ! -o interactive ]]; then
    return
fi

compctl -K _dev dev

_dev() {
  local words completions
  read -cA words

  if [ "${#words}" -eq 2 ]; then
    completions="$(dev completions)"
  else
    completions="$(dev completions "${words[@]:1:-1}")"
  fi

  reply=("${(ps:\n:)completions}")
}
