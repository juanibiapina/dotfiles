# PATH Configuration Strategy

## Summary

Environment variables and `PATH` are configured in `~/.zshenv` (which sources `lib/path.zsh`) to work correctly across:
- **All shell types**: login, non-login, interactive, non-interactive
- **All platforms**: macOS (nix-darwin), NixOS, Ubuntu (system-manager)
- **Tmux**: No duplication in nested shells
- **SSH**: Works for non-interactive remote commands

## Why `.zshenv`?

| File        | When It Runs                                            | Our Usage                                           |
|-------------|---------------------------------------------------------|-----------------------------------------------------|
| `~/.zshenv` | Always (login, non-login, interactive, non-interactive) | ✅ Environment variables and PATH (idempotent)       |
| `~/.zshrc`  | Interactive shells only                                 | Prompt, aliases, completion, UI                     |
| (no `.zprofile`) | n/a                                               | Login-only tweaks now live in the idempotent `.zshenv` |

## The Idempotent Approach

### Key Principle
**No duplication is introduced** - PATH is built correctly once per shell session.

### Implementation (lib/path.zsh)
```zsh
if [ -z "$DOTFILES_PATH_CONFIGURED" ]; then
  export DOTFILES_PATH_CONFIGURED=1

  # Prepend custom directories
  path=(
    ~/bin
    ~/resources/node_modules/bin
    ~/workspace/basherpm/basher/bin
    $path  # Preserve system paths from /etc/zshenv
  )

  # Append directories
  path+=( ~/go/bin )

  export PATH
fi
```

### Why It Works

1. **Guard variable** (`DOTFILES_PATH_CONFIGURED`): Ensures code runs only once per shell
2. **Runs after system setup**: `/etc/zshenv` sets up Nix/system paths first
3. **Preserves system paths**: `$path` includes everything from `/etc/zshenv`
4. **Consistent order**: Same PATH in all shell types

## Loading Order

### macOS with nix-darwin
```
/etc/zshenv          → Sets up Nix environment (adds Nix paths)
~/.zshenv            → Sets env vars, sources lib/path.zsh, then cargo env
  [Login shells also source]
/etc/zprofile        → (nix-darwin version, no path_helper)
~/.zshrc             → Interactive configuration
```

### NixOS
```
/etc/zshenv          → Sources /etc/set-environment (sets up Nix)
~/.zshenv            → Sets env vars, sources lib/path.zsh, then cargo env
  [Login shells also source]
~/.zshrc             → Interactive configuration
```

## Verification

### Check for duplicates
```bash
# Should output nothing if no duplicates
echo $PATH | tr ":" "\n" | sort | uniq -d
```

### Count paths
```bash
# Total should equal unique
echo "Total: $(echo $PATH | tr ":" "\n" | wc -l)"
echo "Unique: $(echo $PATH | tr ":" "\n" | sort -u | wc -l)"
```

### View PATH in order
```bash
echo $PATH | tr ":" "\n" | nl
```

## Result

- ✅ No `typeset -U` needed (no duplication to begin with)
- ✅ Works in all shell types (login, non-login, interactive, non-interactive)
- ✅ Works in Tmux (guard prevents re-running)
- ✅ Works for SSH commands (zshenv runs for all shells)
- ✅ Platform-agnostic (macOS, NixOS, Ubuntu)

## Key Takeaway

**The solution is architectural, not tactical**: By choosing the right file (`.zshenv`) and using an idempotent guard pattern, PATH is built correctly once per shell session, eliminating duplication at the source rather than cleaning it up afterward.
### No `.zprofile`

Login-only configuration previously stored in `~/.zprofile` now lives in the idempotent `.zshenv`. This keeps environment variables available to every shell invocation without relying on a separate login-only file.
