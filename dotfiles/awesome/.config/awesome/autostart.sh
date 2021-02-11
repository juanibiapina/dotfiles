#!/usr/bin/env bash

function run {
  if ! pgrep -f $1 ;
  then
    $@&
  fi
}

run alacritty
run dropbox
run firefox-devedition
run qutebrowser
run slack
run spotifywm
