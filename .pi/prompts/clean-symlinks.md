---
description: Remove dangling symlinks from ~/.pi/ after stow re-links pi dotfiles
---

# Clean Pi Symlinks

Remove dangling symlinks from `~/.pi/` left behind when pi dotfiles are renamed, moved, or deleted and stow creates new links without cleaning old ones.

1. Find dangling symlinks under `~/.pi/`:
   ```
   find ~/.pi/ -type l ! -exec test -e {} \; -print
   ```
2. If none found, report clean — nothing to do.
3. If found, show the list and remove them:
   ```
   find ~/.pi/ -type l ! -exec test -e {} \; -delete -print
   ```
4. Confirm removal.
