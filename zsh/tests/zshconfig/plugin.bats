#!/usr/bin/env bats

@test "argument plugin returns zero" {
  run $ZSH_HOME/bin/zshconfig plugin
  [ $status -eq 0 ]
}

@test "argument plugin lists plugins" {
  run $ZSH_HOME/bin/zshconfig plugin
  [ "${lines[0]}" = "Plugins:" ]
}
