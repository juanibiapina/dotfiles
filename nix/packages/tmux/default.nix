{ tmux }:

# tmux 3.6a has multiple grid memory bugs causing crashes (double-free,
# use-after-free, NULL dereference) in long-running sessions, especially
# when entering copy mode or during terminal resize/reflow.
#
# This patch combines 7 upstream fixes from tmux master:
#   035a2f35 - Clear trimmed lines after memmove (issue 4790)
#   f2184639 - NULL check for grid_peek_cell (issue 4848)
#   fedd4440 - Reuse extended entry when clearing RGB cells
#   03104041 - Reuse extended slot when clearing non-RGB cells
#   2c7f73f9 - Replace recallocarray with reallocarray+memset (reflow crash)
#   f7dad4f3 - NULL check for lastgc (issue 4935)
#   4b0ff07b - Prevent extended data reuse after cell move
#
# Plus defensive hardening (not from upstream):
#   grid_adjust_lines - Zero-init new linedata entries after realloc
#   grid_compact_line - Bounds-check extended cell offsets before access
#
# Remove this overlay once nixpkgs updates tmux past 3.6a.
tmux.overrideAttrs (old: {
  patches = (old.patches or []) ++ [
    ./grid-memory-fixes.patch
  ];
})
