---
description: Remove dangling symlinks from ~/.pi/ after stow re-links pi dotfiles
---

# Clean Pi Symlinks

Remove dangling symlinks from `~/.pi/` left behind when pi dotfiles are renamed, moved, or deleted and stow creates new links without cleaning old ones.

1. List dangling symlinks under `~/.pi/`:
   ```
   fd --type symlink --hidden . ~/.pi/ --exec sh -c 'test -e "$1" || echo "$1"' _ {}
   ```
2. If none found, report clean. Nothing to do.
3. If found, show the list and remove them:
   ```
   fd --type symlink --hidden . ~/.pi/ --exec sh -c 'test -e "$1" || rm -v "$1"' _ {}
   ```
4. Confirm removal.
