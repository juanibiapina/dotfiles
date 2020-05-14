# Remap capslock to ctrl
setxkbmap -option ctrl:nocaps

# Configure key repeat
xset r rate 200 40

xrdb -merge ~/.Xresources

# Set background
xsetroot -solid "#000000"

# Start software
xcape
dropbox &
alacritty &
qutebrowser &

exec i3
