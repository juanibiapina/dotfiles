#!/usr/bin/env bats

load test_helper

@test "argument plugin returns zero" {
  run zshconfig plugin
  [ $status -eq 0 ]
}

@test "argument plugin lists plugins" {
  run zshconfig plugin
  [ "${lines[0]}" = "first_plugin" ]
}
