#!/usr/bin/env bats

@test "zshconfig without arguments returns 0" {
  run $ZSH_HOME/bin/zshconfig
  [ $status -eq 0 ]
}

@test "zshconfig without arguments prints usage" {
  run $ZSH_HOME/bin/zshconfig
  [ "${lines[0]}" = "Usage: zshconfig" ]
}
