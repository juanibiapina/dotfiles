local ccc = require('ccc')

ccc.setup({
  highlighter = {
    auto_enable = true,
    lsp = true,
  },
  mappings = {
    ["<Esc>"] = ccc.mapping.quit,
  },
  inputs = {
    ccc.input.oklch,
    ccc.input.rgb,
  },
  outputs = {
    ccc.output.css_oklch,
    ccc.output.css_rgb,
    ccc.output.hex,
  },
})
