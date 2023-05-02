-- https://github.com/nvim-treesitter/nvim-treesitter

require'nvim-treesitter.configs'.setup {
  ensure_installed = {
    -- required parsers
    "c", "lua", "vim", "vimdoc", "query",
    -- extra parsers
    "ruby", "javascript", "typescript"
  },

  -- Install parsers synchronously (only applied to `ensure_installed`)
  sync_install = false,

  -- Automatically install missing parsers when entering buffer
  -- Recommendation: set to false if you don't have `tree-sitter` CLI installed locally
  auto_install = true,

  -- List of parsers to ignore installing
  ignore_install = { "diff" },

  highlight = { enable = true },
  textobjects = {
    select = {
      enable = true,
      lookahead = true, -- Automatically jump forward to textobj, similar to targets.vim
      keymaps = {
        ['aa'] = '@parameter.outer',
        ['ia'] = '@parameter.inner',
        ['af'] = '@function.outer',
        ['if'] = '@function.inner',
        ['ac'] = '@class.outer',
        ['ic'] = '@class.inner',
      },
    },
    swap = {
      enable = true,
      swap_next = {
        ['<leader>al'] = '@parameter.inner',
      },
      swap_previous = {
        ['<leader>ah'] = '@parameter.inner',
      },
    },
  },
}
