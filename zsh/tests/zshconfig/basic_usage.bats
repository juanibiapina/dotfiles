#!/usr/bin/env bats

load test_helper

@test "zshconfig without arguments returns 0" {
  run zshconfig
  assert_equal "$status" 0
}

@test "zshconfig without arguments prints usage" {
  run zshconfig
  assert_equal "${lines[0]}" "Usage: zshconfig command"
}

@test "zshconfig with an invalid argument prints usage" {
  run zshconfig invalidargumentlol
  assert_equal "${lines[0]}" "Usage: zshconfig command"
}
