setup() {
  export ZSH_HOME="$ZSH_HOME/tests/fakehome"
  export EDITOR="echo"
}

assert_equal() {
  if [[ "$1" == "$2" ]]; then
    true
  else
    echo "  --- "
    echo "  severity: fail "
    echo "  data: "
    echo "    expected: $2"
    echo "    got: $1"
    false
  fi
}
