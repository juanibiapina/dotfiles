export PATH="/Users/juanibiapina/.rbenv/shims:${PATH}"

source "/usr/local/Cellar/rbenv/0.3.0/libexec/../completions/rbenv.zsh"

rbenv rehash 2>/dev/null

rbenv() {
  command="$1"
  if [ "$#" -gt 0 ]; then
    shift
  fi

  case "$command" in
  shell)
    eval `rbenv "sh-$command" "$@"`;;
  *)
    command rbenv "$command" "$@";;
  esac
}

# prompt function
rbenv_prompt_info() {
  local name
  name=$(rbenv version-name 2> /dev/null) || return
  if [[ $name == "system" ]]; then
    echo ""
  else
    echo "%{$fg[green]%}[Ruby: $name]%{$reset_color%} "
  fi
}
