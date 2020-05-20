if [ -d "$HOME/.basher" ]; then
  export PATH="$HOME/.basher/bin:$PATH"
  eval "$(basher init - zsh)"
fi
