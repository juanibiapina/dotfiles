session_root "~/development/accounts.babbel"

if initialize_session "accounts"; then
  load_window "nvim"
  new_window "server"
  run_cmd "r s --port 3001"
  load_window "console"
  new_window
  select_window 1
fi

finalize_and_go_to_session
