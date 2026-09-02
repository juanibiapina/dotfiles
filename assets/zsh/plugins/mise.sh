if command -v mise &> /dev/null; then
  _cache_eval mise-activate mise activate zsh
  export MISE_NODE_COREPACK=true
fi

