#!/usr/bin/env bash

function run {
  if ! pgrep -f $1 ;
  then
    $@&
  fi
}

run alacritty
run firefox-devedition
run qutebrowser
run dropbox
run slack
