#!/usr/bin/env bats

@test "zshconfig without arguments returns 0" {
  run zshconfig
  [ $status -eq 0 ]
}

@test "zshconfig without arguments prints usage" {
  run zshconfig
  [ "${lines[0]}" = "Usage: zshconfig" ]
}
