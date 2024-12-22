-- Do not show 'Process exited' message when closing lazygit buffer
local nvim_terminal_augroup = vim.api.nvim_create_augroup('nvim_terminal', { clear = false })

vim.api.nvim_create_autocmd({ 'TermClose' }, {
  group = nvim_terminal_augroup,
  desc = 'Automatically close buffers after running lazygit',
  callback = function(args)
    if vim.v.event.status == 0 then
      -- TODO: Find a better way to detect lazygit, this also breaks when running :terminal
      local info = vim.api.nvim_get_chan_info(vim.bo[args.buf].channel)
      local argv = info.argv or {}
      -- argv should be { ".../zsh", "-c", "lazygit" }
      if #argv == 3 and argv[3] == 'lazygit' then
        vim.cmd({ cmd = 'bdelete', args = { args.buf }, bang = true })
      end
    end
  end,
})

-- Open Lazygit in a floating window
function Lazygit()
  local width = vim.api.nvim_get_option("columns")
  local height = vim.api.nvim_get_option("lines")

  local buffer = vim.api.nvim_create_buf(false, true)
  local win = vim.api.nvim_open_win(buffer, false, {
    relative = 'editor',
    row = 0,
    col = 0,
    width = width,
    height = height - 1,
    style = 'minimal',
    zindex = 1000
  })

  -- override float background color to be the same as the normal background
  vim.api.nvim_set_option_value('winhl', 'NormalFloat:Normal', {win = win})

  vim.api.nvim_set_current_win(win)
  vim.fn.termopen("lazygit")
  vim.cmd("startinsert")
end

function LazygitClose()
  local win = vim.api.nvim_get_current_win()
  local buf = vim.api.nvim_win_get_buf(win)
  vim.api.nvim_win_close(win, true)
  vim.api.nvim_buf_delete(buf, { force = true })
end
