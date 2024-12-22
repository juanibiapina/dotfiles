require("toggleterm").setup{}

local Terminal = require('toggleterm.terminal').Terminal

local lazygit = Terminal:new({
  cmd = "lazygit",
  display_name = "lazygit",
  close_on_exit = true,
  direction = "float",
  float_opts = {
    border = "none",
    row = 0,
    col = 0,
    width = function()
      return vim.api.nvim_get_option("columns")
    end,
    height = function()
      return vim.api.nvim_get_option("lines") - 1
    end,
    zindex = 1001,
  }
})

function LazygitOpen()
  lazygit:open()
end

function LazygitClose()
  lazygit:shutdown()
end
