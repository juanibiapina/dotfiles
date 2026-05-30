# tmux 3.6a Grid Memory Crashes

**Date:** 2026-05-26 (first crash), ongoing
**Status:** Patched with upstream fixes + defensive hardening; monitoring
**Files:** `nix/packages/tmux/default.nix`, `nix/packages/tmux/grid-memory-fixes.patch`

## Problem

tmux crashes with SIGABRT after 1–2 days of uptime when entering copy mode. macOS malloc detects heap corruption (`POINTER_BEING_FREED_WAS_NOT_ALLOCATED`) during a `free()` call inside `grid_clear_lines`.

## Crash Signature

Both observed crashes (May 26, May 29) have the identical stack:

```
__pthread_kill → pthread_kill → abort → malloc_vreport → malloc_report
→ ___BUG_IN_CLIENT_OF_LIBMALLOC_POINTER_BEING_FREED_WAS_NOT_ALLOCATED
→ grid_clear_lines+140
→ screen_reinit+256
→ window_copy_clone_screen+236
→ window_copy_init+88
→ window_pane_set_mode → cmd_copy_mode_exec → cmdq_next → server_loop
```

Crash reports are in `~/Library/Logs/DiagnosticReports/tmux-*.ips`.

## Root Cause Analysis

The crash happens on a **freshly created grid** (allocated with `xcalloc`, all zeros). `grid_clear_lines` calls `free(NULL)` on each line's `celldata`/`extddata`, which should be a no-op. The SIGABRT means the **heap metadata itself is corrupt** from earlier operations during the session's uptime, not that the grid data is bad.

Disassembly confirms the crash is at the first `free(gd->linedata[yy].celldata)` call in the `grid_clear_lines` loop (ARM64 offset +140 = the `bl _free` return site).

## Why the Grid is the Corruption Source

tmux 3.6a has multiple known grid memory bugs (all fixed on upstream master but not backported to any release). These corrupt the heap over time through:

- Stale pointers after `memmove` in `grid_trim_history` (lines freed but copies remain)
- Out-of-bounds extended cell access when offsets are corrupt
- `xreallocarray` leaving garbage in newly allocated linedata entries
- `recallocarray` size mismatch after grid reflow
- NULL dereference paths in `grid_peek_line` / `grid_string_cells`

## Patch Contents

The patch (`nix/packages/tmux/grid-memory-fixes.patch`) has two layers:

### Upstream backports (7 commits from tmux master)

| Commit | Fix |
|--------|-----|
| `035a2f35` | `grid_trim_history`: `memset` after `memmove` to clear stale line copies |
| `f2184639` | `grid_peek_line` can return NULL — add checks (issue 4848) |
| `fedd4440` | Reuse extended entry when clearing RGB cells (prevents memory growth) |
| `03104041` | Reuse extended slot when clearing non-RGB cells too |
| `2c7f73f9` | Replace `recallocarray` with `xreallocarray`+`memset` in `grid_expand_line` (stored size wrong after reflow) |
| `f7dad4f3` | NULL check for `lastgc` in `grid_string_cells` (issue 4935) |
| `4b0ff07b` | Add `moved` flag to `grid_clear_cell` — don't reuse extended data after cell move |

### Defensive hardening (not from upstream)

Added after the May 29 crash showed the upstream backports alone weren't enough:

- **`grid_adjust_lines`**: Zero-initialize new linedata entries after `xreallocarray`. The old code left garbage pointers when the array grew; callers are *supposed* to initialize them, but this is a safety net.
- **`grid_compact_line`**: Bounds-check `gce->offset` against `gl->extdsize` before accessing `gl->extddata[gce->offset]`. Cells with corrupt offsets get their `GRID_FLAG_EXTENDED` flag stripped instead of causing out-of-bounds reads.

## Key Facts for Future Investigation

- **nixpkgs is still on 3.6a** (checked 2026-05-29; 3.6b exists but only has SIXEL fixes, not grid fixes). All our grid fixes are only on upstream master.
- The `7cbb9652` fix (`from == NULL` check in `grid_reflow_join`) is **already in 3.6a** — we don't need to backport it.
- `grid_adjust_lines` is only called from `screen_resize_y` in `screen.c`. The old size can be computed as `gd->hsize + gd->sy` because callers may modify `hsize` before calling but the math still works out (verified for both shrink and grow paths).
- `grid_compact_line` has **no bounds check** on `gce->offset` even in upstream master. Our fix is novel.
- The `022b5cf1` fix (clamp `data->oy` on resize to prevent unsigned underflow) is NOT included yet. It only matters when already in copy mode during a resize, not on initial entry.
- Upstream tmux repo: `https://github.com/tmux/tmux`. Clone is cached at `/tmp/tmux-upstream.git` during investigation sessions.

## How to Check for Crashes

```bash
ls -la ~/Library/Logs/DiagnosticReports/tmux-*.ips
```

Parse a crash report's stack:
```bash
cat ~/Library/Logs/DiagnosticReports/tmux-YYYY-MM-DD-HHMMSS.ips | python3 -c "
import json, sys
data = sys.stdin.read().split('\n', 1)
report = json.loads(data[1])
for f in report['threads'][0]['frames']:
    print(f'  {f.get(\"symbol\", \"???\")}+{f.get(\"symbolLocation\", 0)}')
print('Signal:', report['exception']['signal'])
"
```

## If It Crashes Again

1. Check the crash report stack — is it still `grid_clear_lines` → `screen_reinit`? Same offsets?
2. If same stack: the heap corruption source is still not fully addressed. Next steps:
   - Add `022b5cf1` (oy clamp) if not already done
   - Consider building tmux from upstream master directly instead of patching 3.6a
   - Enable `MallocStackLogging=1` in the tmux server environment to trace the actual corruption site
3. If different stack: new bug — analyze the new crash report.

## Applying Changes

After editing the patch:
```bash
git add nix/packages/tmux/
gob run make
```

The running tmux server uses the old binary until restarted (`tmux kill-server` or reboot).
