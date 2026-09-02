# Homebrew environment (PATH, HOMEBREW_PREFIX, etc.) is initialized in
# lib/path.zsh so it runs in .zshenv and user directories take precedence.
if [[ $OSTYPE == darwin* ]]; then
  fpath=(/usr/local/share/zsh-completions $fpath)
fi
