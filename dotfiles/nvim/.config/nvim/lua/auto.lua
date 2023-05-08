-- Load all auto configs in vimscript
for _, conf in ipairs(vim.fn.split(vim.fn.globpath("~/.config/nvim/conf/auto", "*.vim"), "\n")) do
  vim.cmd("source " .. conf)
end

-- Load all auto configs in lua
for _, conf in ipairs(vim.fn.split(vim.fn.globpath("~/.config/nvim/conf/auto", "*.lua"), "\n")) do
  vim.cmd("luafile " .. conf)
end
