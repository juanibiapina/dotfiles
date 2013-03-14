#!/usr/bin/env bats

load test_helper

@test "argument plugin returns zero" {
  run zshconfig plugin
  assert_equal "$status" 0
}

@test "argument plugin prints usage" {
  run zshconfig plugin
  assert_equal "${lines[0]}" "Usage: zshconfig plugin command"
}

@test "argument plugin with invalid argument prints usage" {
  run zshconfig plugin invalidcommandlol
  assert_equal "${lines[0]}" "Usage: zshconfig plugin command"
}

@test "argument 'plugin list' lists plugins" {
  run zshconfig plugin list
  assert_equal "${lines[0]}" "first_plugin"
}

@test "argument 'plugin edit' prints edit usage" {
  run zshconfig plugin edit
  assert_equal "${lines[0]}" "Usage: zshconfig plugin edit [plugin]"
}

@test "argument 'plugin edit first_plugin' opens first_plugin for editing" {
  run zshconfig plugin edit first_plugin
  assert_equal "${lines[0]}" "$ZSH_HOME/plugins/first_plugin.sh"
}
