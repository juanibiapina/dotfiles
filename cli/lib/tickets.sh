# Tickets helper library for managing items in per-project markdown files.
#
# Source this file and call functions directly.
#
# File format:
#   # owner/repo
#   ## Title
#   ---
#   id: aBc
#   state: new
#   ---
#   Optional description body.

# Generate a random 3-character base62 ID
generate_id() {
  LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 3
}

# Generate an ID that is unique within a file
generate_unique_id() {
  local file="$1"
  local id

  while true; do
    id=$(generate_id)
    if [ ! -f "$file" ] || ! grep -q "^id: $id$" "$file"; then
      echo "$id"
      return
    fi
  done
}

# Resolve the current project from $PWD.
# Prints owner/repo to stdout.
resolve_project() {
  if [ -z "$WORKSPACE" ]; then
    echo "WORKSPACE is not set" >&2
    exit 1
  fi

  local rel="${PWD#$WORKSPACE/}"
  if [ "$rel" = "$PWD" ]; then
    echo "Not inside \$WORKSPACE" >&2
    exit 1
  fi

  local owner repo
  owner="$(echo "$rel" | cut -d/ -f1)"
  repo="$(echo "$rel" | cut -d/ -f2)"

  if [ -z "$owner" ] || [ -z "$repo" ]; then
    echo "Could not determine owner/repo from path" >&2
    exit 1
  fi

  echo "$owner/$repo"
}

# Get the tickets file path for a project.
# Prints path to stdout.
project_file() {
  local project="$1"

  if [ -z "$NOTES_VAULT" ]; then
    echo "NOTES_VAULT is not set" >&2
    exit 1
  fi

  echo "$NOTES_VAULT/tickets/$project.md"
}

ensure_file() {
  local file="$1"
  local project="$2"

  mkdir -p "$(dirname "$file")"
  if [ ! -f "$file" ]; then
    printf "# %s\n" "$project" > "$file"
  fi
}

# List all items: prints "id\tstate\tTitle" lines
list_items() {
  local file="$1"

  if [ ! -f "$file" ]; then
    return 0
  fi

  awk '
    /^## / {
      if (title != "") {
        printf "%s\t%s\t%s\n", id, state, title
      }
      title = substr($0, 4)
      state = "new"
      id = ""
      in_frontmatter = 0
      next
    }
    title != "" && !in_frontmatter && /^---$/ {
      in_frontmatter = 1
      next
    }
    in_frontmatter && /^---$/ {
      in_frontmatter = 0
      next
    }
    in_frontmatter && /^state:/ {
      gsub(/^state:[[:space:]]*/, "")
      state = $0
      next
    }
    in_frontmatter && /^id:/ {
      gsub(/^id:[[:space:]]*/, "")
      id = $0
      next
    }
    END {
      if (title != "") {
        printf "%s\t%s\t%s\n", id, state, title
      }
    }
  ' "$file"
}

# Resolve a ticket reference (id or title) to a title.
# Prints the title to stdout.
resolve_ticket() {
  local file="$1"
  local ref="$2"

  # If ref is 3 chars, try matching as id first
  if [ "${#ref}" -eq 3 ]; then
    local title
    title=$(awk -v target="$ref" '
      /^## / {
        current_title = substr($0, 4)
        next
      }
      /^id:/ && current_title != "" {
        gsub(/^id:[[:space:]]*/, "")
        if ($0 == target) {
          print current_title
          exit
        }
      }
    ' "$file")
    if [ -n "$title" ]; then
      echo "$title"
      return
    fi
  fi

  # Fall back to treating ref as a title
  echo "$ref"
}

# Add an item to the file
add_item() {
  local file="$1"
  local project="$2"
  local title="$3"
  local description="$4"

  ensure_file "$file" "$project"

  local state="new"
  if [ -n "$description" ]; then
    state="refined"
  fi

  local id
  id=$(generate_unique_id "$file")

  {
    printf "\n## %s\n" "$title"
    printf -- "---\n"
    printf "id: %s\n" "$id"
    printf "state: %s\n" "$state"
    printf -- "---\n"
    if [ -n "$description" ]; then
      printf "%s\n" "$description"
    fi
  } >> "$file"

  echo "$id"
}

# Delete an item by title
delete_item() {
  local file="$1"
  local title="$2"

  awk -v target="$title" '
    /^## / {
      current = substr($0, 4)
      if (current == target && !deleted) {
        skip = 1
        deleted = 1
        if (prev_blank) {
          # handled by buffering
        }
        next
      }
      skip = 0
    }
    skip { next }
    /^$/ { prev_blank = 1; blank_line = $0; next }
    {
      if (prev_blank) {
        print blank_line
        prev_blank = 0
      }
      print
    }
    END {
      if (prev_blank && !skip) print ""
    }
  ' "$file" > "$file.tmp"
  mv "$file.tmp" "$file"
}

# Show an item full content (front matter + description)
show_item() {
  local file="$1"
  local title="$2"

  awk -v target="$title" '
    /^## / {
      current = substr($0, 4)
      if (current == target) {
        found = 1
        print
        next
      }
      if (found) exit
    }
    found { print }
  ' "$file"
}

# Show just the description (body after closing ---)
show_description() {
  local file="$1"
  local title="$2"

  awk -v target="$title" '
    /^## / {
      current = substr($0, 4)
      if (current == target) {
        found = 1
        fm_count = 0
        past_fm = 0
        next
      }
      if (found) exit
    }
    found && !past_fm && /^---$/ {
      fm_count++
      if (fm_count == 2) { past_fm = 1 }
      next
    }
    found && !past_fm { next }
    found && past_fm { print }
  ' "$file"
}

# Get state for an item
get_state() {
  local file="$1"
  local title="$2"

  awk -v target="$title" '
    /^## / {
      current = substr($0, 4)
      if (current == target) { found = 1; next }
      if (found) exit
    }
    found && /^state:/ {
      gsub(/^state:[[:space:]]*/, "")
      print
      exit
    }
  ' "$file"
}

# Get id for an item
get_id() {
  local file="$1"
  local title="$2"

  awk -v target="$title" '
    /^## / {
      current = substr($0, 4)
      if (current == target) { found = 1; next }
      if (found) exit
    }
    found && /^id:/ {
      gsub(/^id:[[:space:]]*/, "")
      print
      exit
    }
  ' "$file"
}

# Replace an entire section with new content (from a temp file)
edit_item() {
  local file="$1"
  local old_title="$2"
  local new_content_file="$3"

  local new_content
  new_content=$(cat "$new_content_file")

  awk -v target="$old_title" -v replacement="$new_content" '
    /^## / {
      current = substr($0, 4)
      if (current == target && !replaced) {
        skip = 1
        replaced = 1
        print replacement
        next
      }
      skip = 0
    }
    skip { next }
    { print }
  ' "$file" > "$file.tmp"
  mv "$file.tmp" "$file"
}

# Set state in front matter
set_state() {
  local file="$1"
  local title="$2"
  local new_state="$3"

  awk -v target="$title" -v new_state="$new_state" '
    /^## / {
      current = substr($0, 4)
      if (current == target) { in_target = 1 }
      else { in_target = 0 }
    }
    in_target && /^state:/ {
      print "state: " new_state
      next
    }
    { print }
  ' "$file" > "$file.tmp"
  mv "$file.tmp" "$file"
}

# Set/replace description (body after closing ---)
set_description() {
  local file="$1"
  local title="$2"
  local description="$3"

  awk -v target="$title" -v desc="$description" '
    /^## / {
      if (in_target && past_fm) {
        printf "%s\n", desc
        in_target = 0
        past_fm = 0
      }
      current = substr($0, 4)
      if (current == target) {
        in_target = 1
        fm_count = 0
        past_fm = 0
      }
      print
      next
    }
    in_target && !past_fm && /^---$/ {
      fm_count++
      print
      if (fm_count == 2) { past_fm = 1 }
      next
    }
    in_target && past_fm {
      next
    }
    { print }
    END {
      if (in_target && past_fm) {
        printf "%s\n", desc
      }
    }
  ' "$file" > "$file.tmp"
  mv "$file.tmp" "$file"
}

# Move a section up (swap with previous section)
move_up() {
  local file="$1"
  local title="$2"

  awk -v target="$title" '
    /^## / {
      if (section_title != "") {
        sections[section_count] = section_content
        titles[section_count] = section_title
        section_count++
      }
      section_title = substr($0, 4)
      section_content = $0 "\n"
      next
    }
    section_title != "" {
      section_content = section_content $0 "\n"
      next
    }
    section_title == "" { header = header $0 "\n" }
    END {
      if (section_title != "") {
        sections[section_count] = section_content
        titles[section_count] = section_title
        section_count++
      }

      printf "%s", header

      for (i = 0; i < section_count; i++) {
        if (titles[i] == target && i > 0) {
          tmp = sections[i]
          sections[i] = sections[i-1]
          sections[i-1] = tmp
          tmp = titles[i]
          titles[i] = titles[i-1]
          titles[i-1] = tmp
        }
      }

      for (i = 0; i < section_count; i++) {
        printf "%s", sections[i]
      }
    }
  ' "$file" > "$file.tmp"
  mv "$file.tmp" "$file"
}

# Move a section down (swap with next section)
move_down() {
  local file="$1"
  local title="$2"

  awk -v target="$title" '
    /^## / {
      if (section_title != "") {
        sections[section_count] = section_content
        titles[section_count] = section_title
        section_count++
      }
      section_title = substr($0, 4)
      section_content = $0 "\n"
      next
    }
    section_title != "" {
      section_content = section_content $0 "\n"
      next
    }
    section_title == "" { header = header $0 "\n" }
    END {
      if (section_title != "") {
        sections[section_count] = section_content
        titles[section_count] = section_title
        section_count++
      }

      printf "%s", header

      for (i = section_count - 1; i >= 0; i--) {
        if (titles[i] == target && i < section_count - 1) {
          tmp = sections[i]
          sections[i] = sections[i+1]
          sections[i+1] = tmp
          tmp = titles[i]
          titles[i] = titles[i+1]
          titles[i+1] = tmp
        }
      }

      for (i = 0; i < section_count; i++) {
        printf "%s", sections[i]
      }
    }
  ' "$file" > "$file.tmp"
  mv "$file.tmp" "$file"
}

# Icon for a state (nerd font)
state_icon() {
  local state="$1"
  case "$state" in
    new)      printf '\uf10c' ;;   # nf-fa-circle_o
    refined)  printf '\uf042' ;;   # nf-fa-adjust
    planned)  printf '\uf111' ;;   # nf-fa-circle
    *)        printf '\uf10c' ;;
  esac
}

# Next state in the workflow
next_state() {
  local current="$1"
  case "$current" in
    new)      echo "refined" ;;
    refined)  echo "planned" ;;
    planned)  echo "planned" ;;
    *)        echo "new" ;;
  esac
}

# Previous state in the workflow
prev_state() {
  local current="$1"
  case "$current" in
    new)      echo "new" ;;
    refined)  echo "new" ;;
    planned)  echo "refined" ;;
    *)        echo "new" ;;
  esac
}
