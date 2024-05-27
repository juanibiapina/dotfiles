# Create a new window.
#
# Arguments:
#   - $1: (optional) Name/title of window.
#   - $2: (optional) Shell command to execute when window is created.
#
new_window() {
  if [ -n "$1" ]; then local winarg=(-n "$1"); fi

  tmux new-window -t "$session:" "${winarg[@]}"

  window="$(__get_current_window_index)"
}

# Split current window/pane vertically.
#
# Arguments:
#   - $1: (optional) Percentage of frame the new pane will use.
#   - $2: (optional) Target pane ID to split in current window.
#
split_v() {
  if [ -n "$1" ]; then local percentage=(-p "$1"); fi
  tmux split-window -t "$session:$window.$2" -v "${percentage[@]}"
}

# Split current window/pane horizontally.
#
# Arguments:
#   - $1: (optional) Percentage of frame the new pane will use.
#   - $2: (optional) Target pane ID to split in current window.
#
split_h() {
  if [ -n "$1" ]; then local percentage=(-p "$1"); fi
  tmux split-window -t "$session:$window.$2" -h "${percentage[@]}"
}

# Split current window/pane vertically by line count.
#
# Arguments:
#   - $1: (optional) Number of lines the new pane will use.
#   - $2: (optional) Target pane ID to split in current window.
#
split_vl() {
  if [ -n "$1" ]; then local count=(-l "$1"); fi
  tmux split-window -t "$session:$window.$2" -v "${count[@]}"
}

# Split current window/pane horizontally by column count.
#
# Arguments:
#   - $1: (optional) Number of columns the new pane will use.
#   - $2: (optional) Target pane ID to split in current window.
#
split_hl() {
  if [ -n "$1" ]; then local count=(-l "$1"); fi
  tmux split-window -t "$session:$window.$2" -h "${count[@]}"
}

# Run clock mode.
#
# Arguments:
#   - $1: (optional) Target pane ID in which to run
clock() {
  tmux clock-mode -t "$session:$window.$1"
}

# Select a specific window.
#
# Arguments:
#   - $1: Window ID or name to select.
#
select_window() {
  tmux select-window -t "$session:$1"
  window="$(__get_current_window_index)"
}

# Select a specific pane in the current window.
#
# Arguments:
#   - $1: Pane ID to select.
#
select_pane() {
  tmux select-pane -t "$session:$window.$1"
}

# Balance windows vertically with the "even-vertical" layout.
#
# Arguments:
#   - $1: (optional) Window ID or name to operate on.
#
balance_windows_vertical() {
  tmux select-layout -t "$session:${1:-$window}" even-vertical
}

# Balance windows horizontally with the "even-horizontal" layout.
#
# Arguments:
#   - $1: (optional) Window ID or name to operate on.
#
balance_windows_horizontal() {
  tmux select-layout -t "$session:${1:-$window}" even-horizontal
}

# Turn on synchronize-panes in a window.
#
# Arguments:
#   - $1: (optional) Window ID or name to operate on.
#
synchronize_on() {
  tmux set-window-option -t "$session:${1:-$window}" \
                 synchronize-panes on
}

# Turn off synchronize-panes in a window.
#
# Arguments:
#   - $1: (optional) Window ID or name to operate on.
#
synchronize_off() {
  tmux set-window-option -t "$session:${1:-$window}" \
                 synchronize-panes off
}

# Send/paste keys to the currently active pane/window.
#
# Arguments:
#   - $1: String to paste.
#   - $2: (optional) Target pane ID to send input to.
#
send_keys() {
  tmux send-keys -t "$session:$window.$2" "$1"
}

# Runs a shell command in the currently active pane/window.
#
# Arguments:
#   - $1: Shell command to run.
#   - $2: (optional) Target pane ID to run command in.
#
run_cmd() {
  send_keys "$1" "$2"
  send_keys "C-m" "$2"
}

moveto() {
  local target="$1"
  tmux move-window -s "$session:$window" -t "$target"
}

# Create a new session, returning 0 on success, 1 on failure.
#
# Arguments:
#   - $1: (optional) Name of session to create, if not specified `$session`
#         is used.
#
# Example usage:
#
#   if initialize_session; then
#     load_window "example"
#   fi
#
initialize_session() {
  session="$1"

  # Check if the named session already exists.
  if tmux list-sessions 2>/dev/null | grep -q "^$session:"; then
    return 1
  fi

  tmux new-session -d -s "$session"

  # In order to ensure only specified windows are created, we move the
  # default window to position 999, and later remove it with the
  # `finalize_and_go_to_session` function.
  local first_window_index=$(__get_first_window_index)
  tmux move-window \
    -s "$session:$first_window_index" -t "$session:999"
}

# Finalize session creation and then switch to it if needed.
#
# When the session is created, it leaves a unused window in position #999,
# this is the default window which was created with the session, but it's also
# a window that was not explicitly created. Hence we kill it.
finalize_and_go_to_session() {
  finalize

  tmux attach-session -t "$session:"
}

finalize() {
  # Kill the default window created with the session.
  # always return zero even if it fails and print no output
  tmux kill-window -t "$session:999" 2>/dev/null || true
}

__get_current_window_index() {
  local lookup=$(tmux list-windows -t "$session:" \
    -F "#{window_active}:#{window_index}" 2>/dev/null | grep "^1:")

  if [ -n "$lookup" ]; then
    echo "${lookup/1:}"
  fi
}

__get_first_window_index() {
  local index=$(tmux list-windows -t "$session:" \
    -F "#{window_index}" 2>/dev/null)

  if [ -n "$index" ]; then
    echo "$index" | head -1
  else
    echo "0"
  fi
}
