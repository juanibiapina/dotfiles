# Starship Initialization

This document explains the rationale behind the starship initialization method used in `assets/zsh/lib/prompt.zsh`.

## Current Implementation

```bash
source <(starship init zsh)
```

## Why This Approach?

### Performance: `source <()` vs `eval "$(...)"`

Benchmarking shows that `source <()` is significantly faster than `eval`:

```
Benchmark Results (2025-11-01):
- source <(starship init zsh):  ~20.3ms (consistent, low variance)
- eval "$(starship init zsh)":  ~29.6ms (slower, higher variance)

Result: source <() is ~1.45x faster
```

**Why the difference?**

1. **`eval "$(...)"`** (command substitution):
   - Runs `starship init zsh`
   - Captures ALL output into memory as a string
   - Then evaluates that string
   - Extra memory allocation and string processing overhead

2. **`source <(...)`** (process substitution):
   - Runs `starship init zsh`
   - Streams output directly via FIFO/named pipe
   - No intermediate string buffer needed
   - More direct execution path

### The `--print-full-init` Flag History

The `--print-full-init` flag was introduced to solve maintenance problems with single-line initialization scripts, but it created complications.

**Problem (pre-2023):** The flag caused starship to be invoked **twice** during shell initialization, adding overhead.

**Solution (2023):** PR [#5322](https://github.com/starship/starship/pull/5322) eliminated the unnecessary indirection. After this optimization, `starship init zsh` and `starship init zsh --print-full-init` produce identical output.

**Current status:** The flag still exists for backward compatibility but serves no purpose for zsh.

## Historical Context

### Issue #2637: "Is `starship init --print-full-init` really necessary?"

[GitHub Issue #2637](https://github.com/starship/starship/issues/2637) discusses removing the `--print-full-init` flag entirely. Key points:

- The flag "introduces more complexity, causes unexpected error and slows down startup time"
- Double invocation during initialization was the primary performance concern
- Proposed alternative: Let each shell handle initialization natively (bash/zsh with `source <()`, fish with piping)
- Status: Remains open with "breaking-change" label (would require major version bump)

### PR #5322: Performance Optimization (Merged 2023)

[PR #5322](https://github.com/starship/starship/pull/5322) - "perf: Skip unnecessary indirection in starship init zsh"

This patch eliminated the intermediate evaluation step, making `starship init zsh` directly output the final initialization script. The discussion notes suggest `source <(starship init zsh)` as the optimal method, though official docs still show `eval` for backward compatibility.

## Official Documentation

Starship's [official guide](https://starship.rs/guide/) recommends:

```bash
eval "$(starship init zsh)"
```

However, this is for maximum compatibility across all shell versions and systems. The `source <()` method is more performant and equally compatible with modern zsh.

## Verification

To verify the outputs are identical:

```bash
diff <(starship init zsh) <(starship init zsh --print-full-init)
# Returns: no differences
```

## Conclusion

Our implementation uses `source <(starship init zsh)` because:

1. ✅ **Faster**: ~1.45x faster than `eval` method (~9ms saved per shell startup)
2. ✅ **Modern**: Takes advantage of 2023 performance optimizations
3. ✅ **Clean**: No redundant flags that serve no purpose
4. ✅ **Compatible**: Works with all modern zsh versions

---

**Last updated:** 2025-11-01
**Starship version tested:** 1.23.0
