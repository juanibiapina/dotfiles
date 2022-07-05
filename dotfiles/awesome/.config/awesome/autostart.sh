#!/usr/bin/env bash

function run {
  if ! pgrep -f $1 ;
  then
    $@&
  fi
}

# Disable screensaver and monitor power saving settings
#xset s off -dpms

xrandr --output DP-2 --auto --rotate left --output DP-4 --auto --primary --right-of DP-2

run alacritty
run dropbox
run firefox-devedition
run hamsket
run keepassxc
run pasystray
run slack
run udiskie --tray
