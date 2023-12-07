# Configure bat as man pager
export MANPAGER="sh -c 'col -bx | bat -l man -p'"

# Fix issue with colors in man pages
# https://github.com/sharkdp/bat/issues/2568
export MANROFFOPT="-c"

# Set bat theme
export BAT_THEME="Solarized (dark)"
