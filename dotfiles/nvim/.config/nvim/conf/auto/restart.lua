-- Restart function
function RestartNvim()
  local current_file = vim.fn.expand('%:p')
  if current_file ~= '' then
    local restart_dir = vim.fn.getcwd() .. '/.local/share/nvim'
    local restart_file = restart_dir .. '/restart_file'

    -- Create directory if it doesn't exist
    vim.fn.mkdir(restart_dir, 'p')
    vim.fn.writefile({current_file}, restart_file)
  end
  vim.cmd('qall!')
end

-- Auto-reopen on restart
vim.api.nvim_create_autocmd('VimEnter', {
  callback = function()
    local restart_file = vim.fn.getcwd() .. '/.local/share/nvim/restart_file'
    if vim.fn.filereadable(restart_file) == 1 then
      local file_to_open = vim.fn.readfile(restart_file)[1]
      vim.fn.delete(restart_file)
      -- Delay to ensure all plugins and syntax highlighting are loaded
      vim.defer_fn(function()
        vim.cmd('edit ' .. file_to_open)
      end, 100)
    end
  end
})
