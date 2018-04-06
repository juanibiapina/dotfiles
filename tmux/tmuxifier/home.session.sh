session_root "~/development/home.babbel"

if initialize_session "home"; then
  load_window "nvim"
  new_window "server"
  run_cmd "r s"
  load_window "console"
  new_window
  select_window 1
fi

finalize_and_go_to_session
