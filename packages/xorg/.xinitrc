# Remap capslock to ctrl
setxkbmap -option ctrl:nocaps

xrdb -merge ~/.Xresources

# Start software
xcape

exec i3
