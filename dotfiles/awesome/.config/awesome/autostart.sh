#!/usr/bin/env bash

function run {
  if ! pgrep -f $1 ;
  then
    $@&
  fi
}

run alacritty
run firefox-devedition
run "flatpak run io.bit3.WhatsAppQT"
run qutebrowser
run slack
