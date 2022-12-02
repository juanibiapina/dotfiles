if [ "$(uname -s)" = "Darwin" ]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
  fpath=(/usr/local/share/zsh-completions $fpath)
fi
