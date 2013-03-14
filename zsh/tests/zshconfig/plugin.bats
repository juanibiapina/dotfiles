#!/usr/bin/env bats

load test_helper

@test "argument plugin returns zero" {
  run zshconfig plugin
  [ $status -eq 0 ]
}

@test "argument plugin prints usage" {
  run zshconfig plugin
  [ "${lines[0]}" = "Usage: zshconfig plugin list" ]
}

@test "argument 'plugin list' lists plugins" {
  run zshconfig plugin list
  [ "${lines[0]}" = "first_plugin" ]
}
