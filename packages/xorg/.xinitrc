# Remap capslock to ctrl
setxkbmap -option ctrl:nocaps

xrdb -merge ~/.Xresources

# Start software
xcape
dropbox &
alacritty &
qutebrowser &

exec i3
