xrandr --newmode 3840x2160 712.75 3840 4160 4576 5312 2160 2163 2168 2237 -hsync +vsync
xrandr --addmode Virtual1 3840x2160
#xrandr --output Virtual1 --mode 3840x2160
xrandr --output Virtual1 --mode 2560x1600
exec ratpoison
