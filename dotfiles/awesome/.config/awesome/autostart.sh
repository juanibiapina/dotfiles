#!/usr/bin/env bash

function run {
  if ! pgrep -f $1 ;
  then
    $@&
  fi
}

# Disable screensaver and monitor power saving settings
#xset s off -dpms

xrandr --output DP-4 --auto --pos 0x0 --primary --output DP-2 --auto --pos 2560x0

run pcloud
run slack
run udiskie --tray
