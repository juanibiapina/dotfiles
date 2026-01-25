# PATH Configuration

## Goals

- User directories (`~/bin`, `~/go/bin`) take precedence over Homebrew and system paths
- Works for all shell types: login, non-login, interactive, non-interactive
- No duplicate entries
- Works on macOS with nix-darwin

## Why `.zshenv`?

| File | When It Runs | Usage |
|------|--------------|-------|
| `~/.zshenv` | All shells (login, non-login, interactive, non-interactive) | PATH and environment variables |
| `~/.zshrc` | Interactive shells only | Prompt, aliases, completions |

PATH must be configured in `.zshenv` so non-interactive shells (SSH commands, scripts, GUI-spawned shells) have the correct paths.

## How It Works

All PATH configuration happens in `lib/path.zsh`, sourced from `.zshenv`:

```zsh
if [ -z "$DOTFILES_PATH_CONFIGURED" ]; then
  export DOTFILES_PATH_CONFIGURED=1

  # Initialize Homebrew (adds to PATH)
  if [[ "$(uname)" = "Darwin" ]] && [[ -x /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  fi

  # Prepend user directories (highest precedence)
  path=(
    ~/bin
    ~/go/bin
    ~/resources/node_modules/bin
    ~/Library/pnpm
    ~/workspace/basherpm/basher/bin
    $path
  )

  export PATH
fi
```

### Key Points

1. **Guard variable** - `DOTFILES_PATH_CONFIGURED` ensures this runs once per shell session
2. **Homebrew first** - Initialize Homebrew before prepending user directories so they take precedence
3. **Prepend pattern** - `path=(~/bin $path)` puts user directories at the front
4. **Nix handled by system** - `/etc/zshenv` (nix-darwin) sets up Nix paths before our `.zshenv` runs

## Loading Order (macOS with nix-darwin)

```
/etc/zshenv     nix-darwin sets up Nix paths via set-environment
~/.zshenv       Sources lib/path.zsh (Homebrew, then user dirs prepended)
                Sources cargo env
~/.zshrc        Interactive config (prompt, aliases, plugins)
```

## Resulting PATH Order

```
~/bin                           # User directories (highest priority)
~/go/bin
~/resources/node_modules/bin
~/Library/pnpm
~/workspace/basherpm/basher/bin
~/.cargo/bin                    # Cargo (from .zshenv)
/opt/homebrew/bin               # Homebrew
/opt/homebrew/sbin
~/.nix-profile/bin              # Nix paths (from /etc/zshenv)
/etc/profiles/per-user/.../bin
/run/current-system/sw/bin
/nix/var/nix/profiles/default/bin
/usr/local/bin                  # System paths
/usr/bin
/bin
/usr/sbin
/sbin
```

## Verification

```bash
# Check for duplicates (should output nothing)
echo $PATH | tr ":" "\n" | sort | uniq -d

# View PATH in order
echo $PATH | tr ":" "\n" | nl
```
