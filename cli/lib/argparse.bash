# test that getopt from util-linux is available
getopt --test > /dev/null && true
if [[ $? -ne 4 ]]; then
  echo 'getopt is not available'
  exit 1
fi

# declare an associative array to store arguments
declare -A __args

# parse arguments into the associative array
parse_args() {
  local options="$1"
  shift

  local longoptions="$1"
  shift

  # parse command line options
  local parsed=$(getopt --options="$options" --longoptions="$longoptions" --name dev -- "$@") || exit 2
  eval set -- "$parsed"

  while true; do
    case "$1" in
      --)
        shift
        break
        ;;
      *)
        local v="$1"
        __args[$v]=true
        shift
        ;;
    esac
  done
}

# get an argument by name (include -- prefix) from the associative array
arg() {
  local name="$1"
  echo "${__args[$name]}"
}
