if [ -d "$HOME/.rbenv" ]; then
  export PATH="$HOME/.rbenv/bin:$PATH"
  eval "$(rbenv init -)"
fi

# prompt function
rbenv_prompt_info() {
  local name
  name=$(rbenv version-name 2> /dev/null) || return
  if [[ $name == "system" ]]; then
    echo ""
  else
    echo "%{$GREEN%}[Ruby: $name]%{$RESET%} "
  fi
}
