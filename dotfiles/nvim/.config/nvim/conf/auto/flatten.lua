require("flatten").setup({
  window = {
    open = "current",
  },
  callbacks = {
    pre_open = function()
      LazygitClose()
    end,
  },
  pipe_path = require("flatten").default_pipe_path,
})
