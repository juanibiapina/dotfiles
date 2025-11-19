if command -v mise &> /dev/null; then
  eval "$(mise activate zsh)"
  export MISE_NODE_COREPACK=true
fi

