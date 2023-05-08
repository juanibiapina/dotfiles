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

-- load plugins (this loads lua/plugins.lua or lua/plugins/*.lua)
require("lazy").setup("plugins")

-- load the rest of the config
require('config')
require('highlights')
require('auto')
require('shortcuts')
