session_root "~/development/zas"

if initialize_session "zas"; then
  load_window "nvim"
  new_window
  new_window
  run_cmd "zas"
  select_window 1
fi

finalize_and_go_to_session
