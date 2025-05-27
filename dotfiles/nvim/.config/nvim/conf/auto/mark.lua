local function run_job(cmd, on_success)
  vim.fn.jobstart(cmd, {
    stdout_buffered = true,
    stderr_buffered = true,
    on_stdout = function(_, data)
      if data and data[1] ~= "" then
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
        if on_success then on_success() end
      else
        vim.notify("Command `" .. table.concat(cmd, " ") .. "` failed with code " .. code, vim.log.levels.ERROR)
      end
    end,
  })
end

-- Add current file as context
local function add_context_item_for_current_file()
  local filepath = vim.api.nvim_buf_get_name(0)
  if filepath == "" then
    vim.notify("No file associated with the current buffer", vim.log.levels.ERROR)
    return
  end
  run_job({ "mark", "add-context-item-file", filepath }, function()
    vim.notify("Context item added successfully", vim.log.levels.INFO)
  end)
end

-- Add custom text as context
local function add_context_item_with_text(opts)
  local text = opts.args
  if text == "" then
    vim.notify("No text provided", vim.log.levels.ERROR)
    return
  end
  run_job({ "mark", "add-context-item-text", text }, function()
    vim.notify("Context item added successfully", vim.log.levels.INFO)
  end)
end

-- Run mark with existing context
local function run()
  run_job({ "mark", "run" }, function()
    vim.notify("`mark run` completed", vim.log.levels.INFO)
  end)
end

-- New session: mark new + context file + context text + run
local function mark_question(opts)
  local prompt = opts.args
  if prompt == "" then
    vim.notify("Prompt is required", vim.log.levels.ERROR)
    return
  end

  local filepath = vim.api.nvim_buf_get_name(0)
  if filepath == "" then
    vim.notify("No file associated with the current buffer", vim.log.levels.ERROR)
    return
  end

  run_job({ "mark", "new-session" }, function()
    run_job({ "mark", "add-context-item-file", filepath }, function()
      run_job({ "mark", "add-context-item-text", prompt }, function()
        run_job({ "mark", "run" }, function()
          vim.notify("`mark run` completed", vim.log.levels.INFO)
        end)
      end)
    end)
  end)
end

-- Commands
vim.api.nvim_create_user_command("MarkAddContextItemFile", add_context_item_for_current_file, {})
vim.api.nvim_create_user_command("MarkAddContextItemText", add_context_item_with_text, { nargs = 1 })
vim.api.nvim_create_user_command("MarkRun", run, {})
vim.api.nvim_create_user_command("MarkQuestion", mark_question, { nargs = 1 })
