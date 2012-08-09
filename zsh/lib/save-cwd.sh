save_cwd () {
  echo "$PWD" > ~/.cwd
}

load_cwd () {
  cd $(cat ~/.cwd)
}

chpwd_functions+=(save_cwd)
