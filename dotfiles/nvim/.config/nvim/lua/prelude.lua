-- bootstrap lazy
local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not vim.loop.fs_stat(lazypath) then
  vim.fn.system({
    "git",
    "clone",
    "--filter=blob:none",
    "https://github.com/folke/lazy.nvim.git",
    "--branch=stable", -- latest stable release
    lazypath,
  })
end
vim.opt.rtp:prepend(lazypath)

-- set leader to space
-- this needs to happen before lazy is setup
vim.g.mapleader = " "
vim.g.maplocalleader = " "

-- disable legacy commands from neotree 1.x
-- this needs to happen before lazy is setup
vim.cmd([[ let g:neo_tree_remove_legacy_commands = 1 ]])

