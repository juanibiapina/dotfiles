-- Configuring StatusColumn so that foldlevels are not shown in the status column
-- https://github.com/neovim/neovim/pull/17446#issuecomment-1407651883

local builtin = require("statuscol.builtin")

require("statuscol").setup({
  segments = {
    { text = { "%s" },             click = "v:lua.ScSa" },
    { text = { builtin.lnumfunc }, click = "v:lua.ScLa", },
    {
      text = { " ", builtin.foldfunc, " " },
      condition = { builtin.not_empty, true, builtin.not_empty },
      click = "v:lua.ScFa"
    },
  },
})
