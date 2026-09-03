# zsh startup profiling — findings

Host: personal mac (juanibiapina). Measured with the `ZSH_PROFILE` harness
added to `.zshenv` + `assets/zsh/zshrc.sh`, plus `dev zsh-profile bench` and
`dev zsh-profile analyze`.

## Baseline (reproduce with `dev zsh-profile bench`)

| Scenario | Command | Time |
|---|---|---|
| Warm | `hyperfine 'zsh -ic exit'` | **311.5 ms ± 4.5** (30 runs) |
| Cold (fresh `~/.zcompdump`) | same, `rm -f ~/.zcompdump*` before each | **1.300 s ± 0.042** (10 runs) |

The cold number is the one-time first-shell-after-login / after-upgrade cost;
warm is every subsequent shell.

## Ranked offenders

Two buckets dominate. zprof sees the functions; the xtrace pass
(`dev zsh-profile analyze`) sees the subprocess `eval "$(...)"` calls that zprof
cannot.

### Bucket A — compinit security audit (every startup)
- `compinit` **~162 ms** total in zprof, of which `compaudit` is **~148 ms**
  (`compaudit:60` 47 ms + `compaudit:154` 18 ms in xtrace).
- Cause: `assets/zsh/lib/completions.zsh:2` calls `compinit -i` with no cache,
  so `compaudit` stats every `fpath` dir for insecure perms on every shell.
- **Fix:** cache the dump and skip the audit on the hot path. Standard pattern:
  run a full `compinit` (with audit) only when `~/.zcompdump` is older than a
  day, else `compinit -C -d ~/.zcompdump`. Expected saving ~60–150 ms warm.

### Bucket B — subprocess `eval "$(...)"` at startup
Single-run spot checks (`/usr/bin/time zsh -c '<gen>'`), noisy but indicative:

| Generator | Site | ~cost |
|---|---|---|
| `brew shellenv` | `lib/path.zsh` (.zshenv) | ~50 ms |
| `starship init zsh` | `lib/prompt.zsh:1` | ~30 ms (xtrace attributes ~150 ms at `prompt:32`, incl. first-prompt render) |
| `gob completion zsh` | `after/gob.sh:1` (`source <(...)`) | ~30 ms |
| `mise activate zsh` | `plugins/mise.sh` (+ `_mise_hook` ~17 ms per prompt) | ~20 ms |
| `basher init - zsh` | `plugins/basher.sh` | ~10 ms |
| `mcpli completion zsh` | `plugins/mcpli.sh` | ~10 ms |
| `uname` | `.zshenv:57` (`os=$(uname)`) | ~10 ms |

- **Fix (cache):** for the static generators (`brew shellenv`, `starship init`,
  `mise activate`, `basher init`, `mcpli completion`, `gob completion`) write the
  output to a generated file and source that; regenerate only when the tool
  binary/version changes. Turns ~150 ms of subprocess spawns into file sources.
- **Fix (lazy):** `mise`, `kubectl`, `mcpli` are rarely needed at prompt time —
  lazy-load on first use instead of activating at startup.
- **Fix (trivial):** `.zshenv:57` `os=$(uname)` can be replaced by `$OSTYPE`
  (no subprocess). Marginal (~7–10 ms) but free.

## Notes / caveats
- xtrace attributes a gap to the line printed *before* it, so a blocking
  subprocess (process substitution) can show its cost on a neighbouring line
  (e.g. starship at `prompt:32`). Cross-check with the per-generator spot checks
  before assuming a location.
- `_mise_hook` runs on every `precmd` (~17 ms), so it also taxes each new prompt,
  not just startup — another reason to lazy-load mise.
- Harness itself has zero cost when `ZSH_PROFILE` is unset (verified: normal
  interactive shell prints nothing; non-interactive `zsh -c` stderr stays clean).

## Suggested fix order (follow-up task)
1. compinit cache (`-C` + daily audit) — biggest single win, low risk.
2. Cache the subprocess evals to generated files.
3. Lazy-load mise/kubectl/mcpli.
4. `$OSTYPE` instead of `uname` in `.zshenv`.

Re-run `dev zsh-profile bench` after each to confirm the delta against the
311 ms / 1.30 s baseline.

## Update: subprocess-eval caching landed

Added `_cache_eval` (assets/zsh/lib/cache.zsh, sourced from .zshenv), keyed on
resolved binary path `${bin:A}` + mtime, atomic write. Applied to: brew
shellenv (path.zsh), basher init, mise activate, starship init, gob completion,
mcpli completion.

- Warm startup: 155ms -> **123ms** (bench inherits DOTFILES_PATH_CONFIGURED so
  brew is excluded from the bench; real logins gain more).
- `${bin:A}` cost negligible (<0.03ms); the ~5ms/site that remains is sourcing
  the completion/init definitions themselves — inherent, unavoidable.
- Remaining warm cost is dominated by **per-prompt** hooks (mise hook-env ~19ms,
  direnv ~26ms) which are OUT OF SCOPE for startup-only work.

Compinit fix (earlier) + this caching: 318ms -> 123ms warm.

Remaining startup items are small; the next real wins are per-prompt (mise
hook, out of scope) and the gob ~30ms fixed-overhead fix (handed to gob session).

## Update: gob 3.7.1 ships completions -> deleted our gob.sh

gob 3.7.0 removed startup telemetry (~30ms -> ~10ms per invocation); 3.7.1 ships
zsh completion via Homebrew into /opt/homebrew/share/zsh/site-functions/_gob
(already on fpath). compinit autoloads it lazily at zero startup cost, so
assets/zsh/after/gob.sh (the _cache_eval mitigation) was deleted entirely and its
~/.cache/zsh/gob-completion.zsh removed.

Warm startup: 123ms -> 109ms. Full progression: 318 -> 155 (compinit) -> 123
(eval caching) -> 109 (drop gob.sh). The remaining _cache_eval sites (brew,
basher, mise-activate, starship, mcpli) stay; those are init scripts or
completions not yet shipped on fpath.

## Update: Tier 1 (fork elimination) + Tier 2 (bytecode)

- Tier 1 (commit b232f1d2): replaced uname/whoami forks with $OSTYPE/$USERNAME in
  .zshenv, brew.sh, run-help.sh, completions.zsh. 109ms -> 87ms.
- Tier 2 (commit 8e8502ba): zcompile ~/.zcompdump + cached init files to .zwc.
  87ms -> 82ms.

Full progression warm: 318 -> 155 (compinit) -> 123 (eval caching) -> 109 (drop
gob.sh) -> 87 (forks) -> **82ms**. ~74% faster than the original.

Next lever (Tier 3, out of scope, behavior change): per-prompt _mise_hook/direnv
(~40ms) via direnv-scoping or mise --shims, and zsh-defer async for <50ms.

## Update: Part B async deferral (zsh-defer)

Vendored assets/zsh/zsh-defer.plugin.zsh (romkatv, MIT). zshrc.sh now defers the
completion system and after/* (the only compinit-dependent, non-critical pieces)
via `zsh-defer source`; everything the first command needs (PATH, env, aliases,
prompt, direnv/mise hooks) stays eager. Added a `firstprompt` profiler mode +
bench line (needs a PTY via `script`) since `zsh -ic exit` cannot show async gains.

Verified in a real PTY: after idle, compinit=1, _gob=1, mcpli compdef=1 (dev uses
eager compctl). tmux launcher windows exec/TUI before idling, so they skip the
deferred compinit entirely.

- Launcher path (zsh -ic exit): 82 -> 73ms.
- Interactive first-prompt: 94 -> 83ms (A/B, in-shell timestamp, 15-20 runs).

Gotcha learned: zsh-defer fires on ZLE idle via `zle -F` on /dev/null; a PTY test
must continuously drain output or ZLE blocks on the prompt write and never idles
(false negative).
