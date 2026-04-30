{ tmux }:

# tmux 3.6a crashes with a double-free in grid_free_line when entering copy
# mode in long-running sessions on macOS Apple Silicon. Apply the upstream fix
# (commit 035a2f35) on top of the released 3.6a until a new tmux release ships.
#
# See https://github.com/tmux/tmux/issues/4777
tmux.overrideAttrs (old: {
  patches = (old.patches or []) ++ [
    ./4790-clear-trimmed-lines.patch
  ];
})
