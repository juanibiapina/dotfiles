if [ "$(uname -s)" = "Darwin" ]; then
  unalias run-help
  autoload run-help
  HELPDIR=/usr/local/share/zsh/help
fi
