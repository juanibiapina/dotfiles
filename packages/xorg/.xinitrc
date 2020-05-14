# Remap capslock to ctrl
setxkbmap -option ctrl:nocaps

# Configure key repeat
xset r rate 200 40

xrdb -merge ~/.Xresources

# Start software
xcape
dropbox &
alacritty &
qutebrowser &

exec i3
