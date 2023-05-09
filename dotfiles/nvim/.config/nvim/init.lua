require("prelude")

-- setup lazy
require("lazy").setup({
  -- this loads lua/plugins.lua or lua/plugins/*.lua
  spec = "plugins",
  change_detection = {
    enabled = false,
  },
})

-- load the rest of the config
require('config')
require('highlights')
require('auto')
require('shortcuts')
