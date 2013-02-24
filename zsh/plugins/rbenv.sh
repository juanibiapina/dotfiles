export PATH="$HOME/.rbenv/bin:$PATH"

eval "$(rbenv init -)"

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
