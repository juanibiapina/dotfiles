-- bootstrap lazy
local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not vim.loop.fs_stat(lazypath) then
  vim.fn.system({
    "git",
    "clone",
    "--filter=blob:none",
    "https://github.com/folke/lazy.nvim.git",
    "--branch=stable", -- latest stable release
    lazypath,
  })
end
vim.opt.rtp:prepend(lazypath)

-- set leader to space
vim.g.mapleader = " "
vim.g.maplocalleader = " "

-- setup plugins
require("lazy").setup({
  spec = {
    { -- keymap documentation
      "folke/which-key.nvim",
      config = function()
        require("which-key").setup({})
      end,
    },

    { -- Treesitter
      'nvim-treesitter/nvim-treesitter',
      dependencies = {
        'nvim-treesitter/nvim-treesitter-textobjects',
      },
      build = ":TSUpdate",
    },

    -- migrated from Plug

    -- Navigation
    "juanibiapina/vim-lighttree",
    "mileszs/ack.vim",
    "tpope/vim-unimpaired",

    "junegunn/fzf",
    "junegunn/fzf.vim",

    -- Utilities
    "dense-analysis/ale",
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

    -- Bats
    "juanibiapina/bats.vim",

    -- Colors
    "lifepillar/vim-solarized8",

    -- Github CoPilot
    "github/copilot.vim",

    -- Clojure
    "tpope/vim-fireplace",

    -- Coffeescript
    "kchmck/vim-coffee-script",

    -- CSS
    "hail2u/vim-css3-syntax",
    "cakebaker/scss-syntax.vim",

    -- Diff
    "lambdalisue/vim-improve-diff",
    "lambdalisue/vim-unified-diff",

    -- Docker
    "ekalinin/Dockerfile.vim",

    -- Elm
    "elmcast/elm-vim",

    -- Git
    "tpope/vim-git",
    "tpope/vim-fugitive",
    "airblade/vim-gitgutter",

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

    -- Racket
    "wlangstroth/vim-racket",

    -- Rails
    "tpope/vim-rails",

    -- Ruby
    "vim-ruby/vim-ruby",
    "ngmy/vim-rubocop",
    "tpope/vim-bundler",
    "keith/rspec.vim",

    -- Rust
    "rust-lang/rust.vim",

    { -- Snippets
      "garbas/vim-snipmate",
      dependencies = {
        "MarcWeber/vim-addon-mw-utils",
        "tomtom/tlib_vim",
      },
      init = function()
        vim.g.snipMate = { snippet_version = 1 }
      end,
    },

    -- Terraform
    "hashivim/vim-terraform",

    -- Testing
    "juanibiapina/vim-runner",

    -- Tmux
    "tmux-plugins/vim-tmux-focus-events",

    -- Toml
    "cespare/vim-toml",

    -- Workflow
    "juanibiapina/vim-later",

    -- Yaml
    "stephpy/vim-yaml",
  },
  performance = {
    rtp = {
      -- disable some rtp plugins
      disabled_plugins = {
        "gzip",
        -- "matchit",
        -- "matchparen",
        -- "netrwPlugin",
        "tarPlugin",
        "tohtml",
        "tutor",
        "zipPlugin",
      },
    },
  },
})

local function source_vimscript(filepath)
  local command = 'source ' .. filepath
  vim.api.nvim_exec(command, false)
end

local home = os.getenv('HOME')
local nvim_config_path = home .. '/.config/nvim/conf/'

source_vimscript(nvim_config_path .. 'conf.vim')
source_vimscript(nvim_config_path .. 'auto.vim')
source_vimscript(nvim_config_path .. 'shortcuts.vim')
