if [ "$(uname -s)" = "Darwin" ]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
  fpath=(/usr/local/share/zsh-completions $fpath)
  export HOMEBREW_CASK_OPTS="--no-quarantine"
fi
