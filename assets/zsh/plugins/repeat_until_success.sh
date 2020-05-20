#!/usr/bin/env bash
#
# Repeats the last command run until it succeeds

repeat_until_success() {
  local cmd="$(fc -ln -1)"

  echo " => Running: $cmd"
  until $cmd; do
    echo " => Running: $cmd"
  done
}

