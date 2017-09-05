session_root "~/development/copland.gem"

if initialize_session "copland"; then
  load_window "nvim"
  new_window
  select_window 1
fi

finalize_and_go_to_session
