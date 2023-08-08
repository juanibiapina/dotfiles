function TermRun(cmd)
  if vim.o.autowrite or vim.o.autowriteall then
    vim.cmd('silent! wall')
  end

  vim.cmd('vertical belowright T ' .. cmd)
  vim.cmd(':Topen')

  -- vim.fn.system("dev tmux run " .. cmd)
end

function TermToggle()
  vim.cmd('vertical belowright Ttoggle')
end
