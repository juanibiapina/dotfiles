require("flatten").setup({
  window = {
    open = "current",
  },
  callbacks = {
    pre_open = function()
      -- close lazygit before opening files
      LazygitClose()
    end,
  },
  pipe_path = function()
    -- running inside a neovim terminal
    if vim.env.NVIM then
      return vim.env.NVIM
    end

    -- running inside tmux
    --local result = vim.system({'dev', 'tmux', 'nvim-socket'}, {text = true }):wait()
    --return result.stdout
  end,
})
