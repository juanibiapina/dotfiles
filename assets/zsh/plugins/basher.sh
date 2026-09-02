# init basher if installed
if type basher > /dev/null; then
  # basher is installed in a non default location
  export BASHER_ROOT="$HOME/workspace/basherpm/basher"

  # load shell hook
  _cache_eval basher-init basher init - zsh
fi


