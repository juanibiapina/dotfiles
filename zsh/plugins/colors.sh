colors() {
  for i in $(seq 0 $(tput colors) ) ; do
    tput setaf $i
    echo -n "█"
  done
  echo
}
