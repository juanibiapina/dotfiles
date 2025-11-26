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

# Print an error message.
#
# Arguments:
#   - $1: (optional) Message text, defaults to "Error"
#
error() {
  gum style --foreground 196 --bold "✗ ${1:-Error}"
}

# Print a warning message.
#
# Arguments:
#   - $1: Message text
#
warning() {
  gum style --foreground 214 "⚠ $1"
}

# Confirmation prompt.
#
# Arguments:
#   - $1: Question text
#
# Returns: 0 for yes, 1 for no
#
confirm() {
  gum confirm "$1"
}
