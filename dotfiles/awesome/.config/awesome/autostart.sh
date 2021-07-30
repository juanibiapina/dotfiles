#!/usr/bin/env bash

function run {
  if ! pgrep -f $1 ;
  then
    $@&
  fi
}

# Disable screensaver and monitor power saving settings
#xset s off -dpms

xrandr --output HDMI-A-0 --auto --primary --output DisplayPort-2 --auto --scale 0.5x0.5 --right-of HDMI-A-0

run alacritty
run dropbox
run firefox-devedition
run flatpak run io.bit3.WhatsAppQT
run keepassxc
run pasystray
run qutebrowser -r default
run slack
