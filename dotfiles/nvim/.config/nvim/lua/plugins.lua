return {
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
      { 'j-hui/fidget.nvim', tag = 'legacy' },
    },
  },

  -- keymap documentation
  { "folke/which-key.nvim", config = true },

  -- Treesitter
  {
    'nvim-treesitter/nvim-treesitter',
    build = ":TSUpdate",
  },

  -- fuzzy finder
  {
    "nvim-telescope/telescope.nvim",
    dependencies = {
      "nvim-lua/plenary.nvim",
    },
  },

  -- linter
  "dense-analysis/ale",

  -- Adds git releated signs to the gutter, as well as utilities for managing changes
  'lewis6991/gitsigns.nvim',

  -- Commenting
  { 'numToStr/Comment.nvim', config = true },

  -- file system tree
  {
    "juanibiapina/vim-lighttree",
  },

  -- text objects
  'wellle/targets.vim',

  -- migrated from Plug

  -- Navigation
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

  -- Git
  "tpope/vim-git",
  "tpope/vim-fugitive",

  -- Quickfix
  "itchyny/vim-qfedit",

  -- Rails
  "tpope/vim-rails",

  -- Ruby
  "vim-ruby/vim-ruby",
  "ngmy/vim-rubocop",
  "tpope/vim-bundler",
  "keith/rspec.vim",

  -- Testing
  "juanibiapina/vim-runner",
}
