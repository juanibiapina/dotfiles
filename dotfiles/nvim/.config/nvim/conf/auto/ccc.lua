local ccc = require('ccc')

ccc.setup({
  highlighter = {
    auto_enable = true,
    lsp = true,
  },
  mappings = {
    ["<Esc>"] = ccc.mapping.quit,
  },
})
