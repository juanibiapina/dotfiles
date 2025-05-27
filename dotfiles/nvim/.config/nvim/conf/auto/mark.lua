-- Helper function to run a mark command and handle output
local function run_mark_command(cmd, success_message)
  vim.fn.jobstart(cmd, {
    stdout_buffered = true,
    stderr_buffered = true,
    on_stdout = function(_, data)
      if data then
        vim.notify(table.concat(data, "\n"), vim.log.levels.INFO)
      end
    end,
    on_stderr = function(_, data)
      if data and data[1] ~= "" then
        vim.notify("Error: " .. table.concat(data, "\n"), vim.log.levels.ERROR)
      end
    end,
    on_exit = function(_, code)
      if code == 0 then
        vim.notify(success_message, vim.log.levels.INFO)
      else
        vim.notify("Command exited with code " .. code, vim.log.levels.WARN)
      end
    end,
  })
end

local function add_context_item_for_current_file()
  local filepath = vim.api.nvim_buf_get_name(0)
  if filepath == "" then
    vim.notify("No file associated with the current buffer", vim.log.levels.ERROR)
    return
  end

  run_mark_command({ "mark", "add-context-item-file", filepath }, "Context item added successfully")
end

local function add_context_item_with_text(opts)
  local text = opts.args
  if text == "" then
    vim.notify("No text provided", vim.log.levels.ERROR)
    return
  end

  run_mark_command({ "mark", "add-context-item-text", text }, "Context item added successfully")
end

local function run()
  run_mark_command({ "mark", "run" }, "`mark run` completed")
end

-- Commands
vim.api.nvim_create_user_command("MarkAddContextItemText", add_context_item_with_text, { nargs = 1 })
vim.api.nvim_create_user_command("MarkAddContextItemFile", add_context_item_for_current_file, {})
vim.api.nvim_create_user_command("MarkRun", run, {})
