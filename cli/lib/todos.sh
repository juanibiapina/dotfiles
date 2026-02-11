#!/usr/bin/env bash
#
# Todos helper library for managing items in $NOTES_VAULT/Todos.md
#
# Usage: bash todos.sh <command> <args...>
#
# Commands:
#   list <section>
#   add <section> <text>
#   delete <section> <line>
#   edit <section> <old_line> <new_text>
#   toggle <section> <line>
#   move-up <section> <line>
#   move-down <section> <line>

set -e

todo_file="$NOTES_VAULT/Todos.md"

ensure_file() {
  if [ ! -f "$todo_file" ]; then
    printf "# Todos\n" > "$todo_file"
  fi
}

ensure_section() {
  local section="$1"
  ensure_file
  if ! grep -qF "$section" "$todo_file"; then
    printf "\n%s\n\n" "$section" >> "$todo_file"
  fi
}

# Extract items from a section (lines starting with "- [")
list_items() {
  local section="$1"
  ensure_file
  awk -v section="$section" '
    $0 == section { found=1; next }
    found && /^## / { exit }
    found && /^- \[/ { print }
  ' "$todo_file"
}

# Add item to a section
add_item() {
  local section="$1"
  local text="$2"
  local item="- [ ] $text"

  ensure_section "$section"

  local section_line
  section_line=$(grep -nF "$section" "$todo_file" | head -1 | cut -d: -f1)

  local next_section_line
  next_section_line=$(tail -n +"$((section_line + 1))" "$todo_file" | grep -n "^## " | head -1 | cut -d: -f1)

  if [ -n "$next_section_line" ]; then
    local insert_at=$((section_line + next_section_line - 1))
    sed -i '' "${insert_at}i\\
${item}
" "$todo_file"
  else
    printf -- "%s\n" "$item" >> "$todo_file"
  fi
}

# Delete an item (exact line match, first occurrence in section)
delete_item() {
  local section="$1"
  local line="$2"

  awk -v section="$section" -v target="$line" '
    $0 == section { in_section=1; print; next }
    in_section && /^## / { in_section=0 }
    in_section && !deleted && $0 == target { deleted=1; next }
    { print }
  ' "$todo_file" > "$todo_file.tmp"
  mv "$todo_file.tmp" "$todo_file"
}

# Edit an item (preserves checkbox state)
edit_item() {
  local section="$1"
  local old_line="$2"
  local new_text="$3"

  local checkbox
  if [[ "$old_line" == "- [x]"* ]]; then
    checkbox="- [x] "
  else
    checkbox="- [ ] "
  fi
  local new_line="${checkbox}${new_text}"

  awk -v section="$section" -v target="$old_line" -v replacement="$new_line" '
    $0 == section { in_section=1; print; next }
    in_section && /^## / { in_section=0 }
    in_section && !replaced && $0 == target { print replacement; replaced=1; next }
    { print }
  ' "$todo_file" > "$todo_file.tmp"
  mv "$todo_file.tmp" "$todo_file"
}

# Toggle checkbox state
toggle_item() {
  local section="$1"
  local line="$2"

  awk -v section="$section" -v target="$line" '
    $0 == section { in_section=1; print; next }
    in_section && /^## / { in_section=0 }
    in_section && !toggled && $0 == target {
      toggled=1
      if (index($0, "- [ ] ") == 1) {
        sub(/^- \[ \] /, "- [x] ")
      } else if (index($0, "- [x] ") == 1) {
        sub(/^- \[x\] /, "- [ ] ")
      }
      print
      next
    }
    { print }
  ' "$todo_file" > "$todo_file.tmp"
  mv "$todo_file.tmp" "$todo_file"
}

# Move item up within its section
move_up() {
  local section="$1"
  local line="$2"

  awk -v section="$section" -v target="$line" '
    $0 == section { in_section=1; print; next }
    in_section && /^## / {
      in_section=0
      if (prev != "") print prev
      prev=""
    }
    in_section && /^- \[/ {
      if (!swapped && $0 == target && prev != "") {
        print $0
        print prev
        prev=""
        swapped=1
        next
      }
      if (prev != "") print prev
      prev = $0
      next
    }
    {
      if (prev != "") { print prev; prev="" }
      print
    }
    END { if (prev != "") print prev }
  ' "$todo_file" > "$todo_file.tmp"
  mv "$todo_file.tmp" "$todo_file"
}

# Move item down within its section
move_down() {
  local section="$1"
  local line="$2"

  awk -v section="$section" -v target="$line" '
    $0 == section { in_section=1; print; next }
    in_section && /^## / {
      in_section=0
      if (pending != "") print pending
      pending=""
    }
    in_section && /^- \[/ {
      if (!swapped && pending != "") {
        print $0
        print pending
        pending=""
        swapped=1
        next
      }
      if (pending != "") { print pending; pending="" }
      if (!swapped && $0 == target) {
        pending = $0
        next
      }
      print
      next
    }
    {
      if (pending != "") { print pending; pending="" }
      print
    }
    END { if (pending != "") print pending }
  ' "$todo_file" > "$todo_file.tmp"
  mv "$todo_file.tmp" "$todo_file"
}

command="$1"
shift

case "$command" in
  list)       list_items "$1" ;;
  add)        add_item "$1" "$2" ;;
  delete)     delete_item "$1" "$2" ;;
  edit)       edit_item "$1" "$2" "$3" ;;
  toggle)     toggle_item "$1" "$2" ;;
  move-up)    move_up "$1" "$2" ;;
  move-down)  move_down "$1" "$2" ;;
  *)
    echo "Unknown command: $command" >&2
    exit 1
    ;;
esac
