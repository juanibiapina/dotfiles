#!/usr/bin/env bash

function run {
  if ! pgrep -f $1 ;
  then
    $@&
  fi
}

xrandr --output HDMI-A-0 --auto --primary --output DisplayPort-2 --auto --scale 0.5x0.5 --right-of HDMI-A-0

run alacritty
run dropbox
run firefox-devedition
run qutebrowser -r default
run slack
run spotifywm
