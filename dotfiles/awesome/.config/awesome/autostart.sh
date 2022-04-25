#!/usr/bin/env bash

function run {
  if ! pgrep -f $1 ;
  then
    $@&
  fi
}

# Disable screensaver and monitor power saving settings
#xset s off -dpms

run alacritty
run dropbox
run ferdi
run firefox-devedition
run keepassxc
run pasystray
run slack
run udiskie --tray
