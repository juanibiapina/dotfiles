# Cache the output of a slow "init"/"completion" generator.
#
# Many tools emit static shell code via `eval "$(tool init)"` /
# `source <(tool completion zsh)`, spawning a process on every shell just to
# print the same script. This caches that output to a file and sources the file
# instead, regenerating only when the tool changes.
#
# Cache key: the resolved binary path (${bin:A}), which changes on nix store and
# homebrew upgrades, plus the binary mtime as a secondary signal for in-place
# local rebuilds (e.g. a `go install`ed binary that keeps its path). This is
# correct where a plain mtime check is not: nix normalizes store mtimes to 1970,
# so `-nt` alone would never refresh a nix tool's cache.
#
# The write is atomic (temp file + mv) and a failing generator never overwrites
# a good cache.
#
# Usage: _cache_eval <name> <command> [args...]
#   _cache_eval starship-init starship init zsh
#   _cache_eval gob-completion gob completion zsh
_cache_eval() {
  local name="$1"; shift
  local cache="${XDG_CACHE_HOME:-$HOME/.cache}/zsh/$name.zsh"
  local src="$cache.src"
  local bin; bin=$(command -v "$1" 2>/dev/null)
  local key="${bin:A}"
  if [[ ! -s $cache || $key != "$(<$src 2>/dev/null)" || ( -n $bin && $bin -nt $cache ) ]]; then
    mkdir -p "${cache:h}"
    # Per-process temp file so concurrent shells never race on the same path.
    local tmp="$cache.$$.tmp"
    if "$@" > "$tmp" 2>/dev/null; then
      mv "$tmp" "$cache"
      print -r -- "$key" > "$src"
      # Compile to bytecode so the source below loads faster on later shells.
      zcompile -R -- "$cache.zwc" "$cache" 2>/dev/null
    else
      rm -f "$tmp"
    fi
  fi
  source "$cache"
}
