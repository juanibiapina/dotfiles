function TermRun(cmd)
  if vim.o.autowrite or vim.o.autowriteall then
    vim.cmd('silent! wall')
  end

  vim.cmd(':T ' .. cmd)
  vim.cmd(':Topen')

  -- vim.fn.system("dev tmux run " .. cmd)
end
