return {
  -- per project configuration files
  { "folke/neoconf.nvim", config = true },

  -- LSP
  {
    'neovim/nvim-lspconfig',
    dependencies = {
      -- Automatically install LSPs to stdpath for neovim
      {
        "williamboman/mason.nvim",
        build = ":MasonUpdate",
      },
      'williamboman/mason-lspconfig.nvim',

      -- Status updates for LSP
      'j-hui/fidget.nvim',

      -- Additional configuration for neovim lua plugin development
      'folke/neodev.nvim',
    },
  },

  -- Autocompletion
  {
    'hrsh7th/nvim-cmp',
    dependencies = {
      'hrsh7th/cmp-nvim-lsp', -- LSP source for nvim-cmp
      'L3MON4D3/LuaSnip', -- Snippets plugin
      'saadparwaiz1/cmp_luasnip', -- Snippets source for nvim-cmp
      'onsails/lspkind.nvim' -- icons for lsp
    },
  },

  -- keymap documentation
  { "folke/which-key.nvim", config = true },

  -- Treesitter
  {
    'nvim-treesitter/nvim-treesitter',
    dependencies = {
      'nvim-treesitter/nvim-treesitter-textobjects',
    },
    build = ":TSUpdate",
  },

  -- fuzzy finder
  {
    "nvim-telescope/telescope.nvim",
    dependencies = {
      "nvim-lua/plenary.nvim",
    },
  },

  -- Adds git releated signs to the gutter, as well as utilities for managing changes
  'lewis6991/gitsigns.nvim',

  -- migrated from Plug

  -- Navigation
  "juanibiapina/vim-lighttree",
  { "mileszs/ack.vim", event = 'VimEnter' },
  "tpope/vim-unimpaired",

  -- Utilities
  "tpope/vim-surround",
  "editorconfig/editorconfig-vim",
  "tpope/vim-repeat",
  "godlygeek/tabular",
  "tpope/vim-eunuch",
  "tpope/vim-abolish",
  -- Detect tabstop and shiftwidth automatically
  "tpope/vim-sleuth",
  "tpope/vim-rhubarb",
  "tpope/vim-capslock",
  "tpope/vim-dispatch",
  "radenling/vim-dispatch-neovim",
  "AndrewRadev/splitjoin.vim",
  "kopischke/vim-fetch",
  "ntpeters/vim-better-whitespace",
  "AndrewRadev/sideways.vim",
  "moll/vim-bbye",
  "sunaku/vim-shortcut",
  "tpope/vim-projectionist",
  "tpope/vim-sensible",
  "kassio/neoterm",

  -- Colors
  "lifepillar/vim-solarized8",

  -- Github CoPilot
  "github/copilot.vim",

  -- Diff
  "lambdalisue/vim-improve-diff",
  "lambdalisue/vim-unified-diff",

  -- Docker
  "ekalinin/Dockerfile.vim",

  -- Git
  "tpope/vim-git",
  "tpope/vim-fugitive",

  -- Go
  "fatih/vim-go",

  -- HTML
  "othree/html5.vim",

  -- Javascript
  "pangloss/vim-javascript",
  "mxw/vim-jsx",

  -- Python
  "aliev/vim-python",
  "mitsuhiko/vim-python-combined",

  -- Quickfix
  "itchyny/vim-qfedit",

  -- Rails
  "tpope/vim-rails",

  -- Ruby
  "vim-ruby/vim-ruby",
  "ngmy/vim-rubocop",
  "tpope/vim-bundler",
  "keith/rspec.vim",

  -- Rust
  "rust-lang/rust.vim",

  -- Terraform
  "hashivim/vim-terraform",

  -- Testing
  "juanibiapina/vim-runner",

  -- Tmux
  "tmux-plugins/vim-tmux-focus-events",

  -- Workflow
  "juanibiapina/vim-later",
}
