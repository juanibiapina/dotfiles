function notify-run () {
  while true
  do
    clear
    date
    echo
    "$@"
    inotifywait -r -e modify . 2> /dev/null
  done
}
