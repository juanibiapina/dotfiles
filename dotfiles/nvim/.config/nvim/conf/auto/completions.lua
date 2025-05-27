local cmp = require("cmp");

cmp.setup({
  preselect = cmp.PreselectMode.None,
  experimental = {
    ghost_text = false,
  },
  snippet = {
    expand = function(args)
      -- vim.fn["vsnip#anonymous"](args.body) -- For `vsnip` users.
      -- require('luasnip').lsp_expand(args.body) -- For `luasnip` users.
      require('snippy').expand_snippet(args.body) -- For `snippy` users.
      -- vim.fn["UltiSnips#Anon"](args.body) -- For `ultisnips` users.
    end,
  },
  mapping = cmp.mapping.preset.insert({
    ['<C-b>'] = cmp.mapping.scroll_docs(-4),
    ['<C-f>'] = cmp.mapping.scroll_docs(4),
    ['<CR>'] = cmp.mapping({
      i = function(fallback)
        if cmp.visible() and cmp.get_active_entry() then
          cmp.confirm({ behavior = cmp.ConfirmBehavior.Replace, select = false })
        else
          fallback()
        end
      end,
    }),
  }),
  sources = cmp.config.sources({
    { name = 'nvim_lsp' },
    --{ name = 'vsnip' }, -- For vsnip users.
    --{ name = 'luasnip' }, -- For luasnip users.
    --{ name = 'ultisnips' }, -- For ultisnips users.
    { name = 'snippy' }, -- For snippy users.
  }),
})

vim.api.nvim_command('highlight! link CmpItemAbbrDeprecated Comment')
vim.api.nvim_command('highlight! link CmpItemAbbrMatch Search')
vim.api.nvim_command('highlight! link CmpItemAbbrMatchFuzzy CmpItemAbbrMatch')
vim.api.nvim_command('highlight! link CmpItemKindVariable Identifier')
vim.api.nvim_command('highlight! link CmpItemKindInterface CmpItemKindVariable')
vim.api.nvim_command('highlight! link CmpItemKindText CmpItemKindVariable')
vim.api.nvim_command('highlight! link CmpItemKindFunction Function')
vim.api.nvim_command('highlight! link CmpItemKindMethod CmpItemKindFunction')
vim.api.nvim_command('highlight! link CmpItemKindKeyword Keyword')
vim.api.nvim_command('highlight! link CmpItemKindProperty CmpItemKindKeyword')
vim.api.nvim_command('highlight! link CmpItemKindUnit CmpItemKindKeyword')
