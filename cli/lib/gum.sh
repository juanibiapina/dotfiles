# Print a styled section header.
#
# Arguments:
#   - $1: Header text to display
#
header() {
  gum style --foreground 212 --bold "$1"
}

# Print an info/status message (indented).
#
# Arguments:
#   - $1: Message text
#
info() {
  gum style --foreground 244 "  $1"
}

# Print a success message.
#
# Arguments:
#   - $1: (optional) Message text, defaults to "Done!"
#
success() {
  gum style --foreground 82 --bold "${1:-Done!}"
}
