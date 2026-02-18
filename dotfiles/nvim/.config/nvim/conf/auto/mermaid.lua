-- Extract the mermaid fenced code block under the cursor and open it in mermaid.live
function MermaidOpenUnderCursor()
  local bufnr = vim.api.nvim_get_current_buf()
  local cursor_line = vim.api.nvim_win_get_cursor(0)[1] -- 1-based
  local lines = vim.api.nvim_buf_get_lines(bufnr, 0, -1, false)

  -- Find the ```mermaid block containing the cursor
  local block_start = nil
  local block_end = nil

  -- Search backwards from cursor for ```mermaid
  for i = cursor_line, 1, -1 do
    if lines[i]:match('^```mermaid') then
      block_start = i
      break
    elseif lines[i]:match('^```$') or lines[i]:match('^```%s') then
      -- Hit a closing fence before finding ```mermaid
      if i < cursor_line then
        break
      end
    end
  end

  if not block_start then
    vim.notify('No ```mermaid block found under cursor', vim.log.levels.WARN)
    return
  end

  -- Search forwards from block_start for closing ```
  for i = block_start + 1, #lines do
    if lines[i]:match('^```%s*$') then
      block_end = i
      break
    end
  end

  if not block_end then
    vim.notify('No closing ``` found for mermaid block', vim.log.levels.WARN)
    return
  end

  if cursor_line < block_start or cursor_line > block_end then
    vim.notify('Cursor is not inside a ```mermaid block', vim.log.levels.WARN)
    return
  end

  -- Extract the mermaid code (between the fences)
  local mermaid_lines = {}
  for i = block_start + 1, block_end - 1 do
    table.insert(mermaid_lines, lines[i])
  end

  local code = table.concat(mermaid_lines, '\n')
  if #code == 0 then
    vim.notify('Mermaid block is empty', vim.log.levels.WARN)
    return
  end

  -- Write to temp file and open
  local tmpfile = vim.fn.tempname() .. '.mmd'
  vim.fn.writefile(vim.split(code, '\n'), tmpfile)
  vim.fn.system('dev mermaid-open ' .. vim.fn.shellescape(tmpfile))
end
