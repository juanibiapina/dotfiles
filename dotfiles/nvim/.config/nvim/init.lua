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
-- this needs to happen before lazy is setup
vim.g.mapleader = " "
vim.g.maplocalleader = " "

-- setup plugins
require("lazy").setup({
  spec = {
    -- per project configuration files
    "folke/neoconf.nvim",

    { -- LSP
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

    -- fuzzy finder
    {
      "nvim-telescope/telescope.nvim",
      dependencies = {
        "nvim-lua/plenary.nvim",
      },
    },

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

-- Setup neoconf
require("neoconf").setup({})

-- Setup fidget
require("fidget").setup({})

require("telescope").setup({
  defaults = {
    mappings = {
      i = {
        ["<esc>"] = require("telescope.actions").close,
        ["<C-j>"] = require("telescope.actions").move_selection_next,
        ["<C-k>"] = require("telescope.actions").move_selection_previous,
      },
    },
  },
})

-- LSP settings.
--  This function gets run when an LSP connects to a particular buffer.
local on_attach = function(_, bufnr)
  local nmap = function(keys, func, desc)
    if desc then
      desc = 'LSP: ' .. desc
    end

    vim.keymap.set('n', keys, func, { buffer = bufnr, desc = desc })
  end

  nmap('<leader>rn', vim.lsp.buf.rename, '[R]e[n]ame')
  nmap('<leader>ca', vim.lsp.buf.code_action, '[C]ode [A]ction')

  nmap('gd', vim.lsp.buf.definition, '[G]oto [D]efinition')
  nmap('gD', vim.lsp.buf.declaration, '[G]oto [D]eclaration')
  nmap('gr', require('telescope.builtin').lsp_references, '[G]oto [R]eferences')
  nmap('gI', vim.lsp.buf.implementation, '[G]oto [I]mplementation')
  nmap('<leader>D', vim.lsp.buf.type_definition, 'Type [D]efinition')
  nmap('<leader>ds', require('telescope.builtin').lsp_document_symbols, '[D]ocument [S]ymbols')
  nmap('<leader>ws', require('telescope.builtin').lsp_dynamic_workspace_symbols, '[W]orkspace [S]ymbols')

  -- See `:help K` for why this keymap
  nmap('K', vim.lsp.buf.hover, 'Hover Documentation')
  nmap('<C-k>', vim.lsp.buf.signature_help, 'Signature Documentation')

  -- Create a command `:Format` local to the LSP buffer
  vim.api.nvim_buf_create_user_command(bufnr, 'Format', function(_)
    vim.lsp.buf.format()
  end, { desc = 'Format current buffer with LSP' })
end

-- Setup neovim lua configuration
require('neodev').setup()

-- nvim-cmp supports additional completion capabilities, so broadcast that to servers
local capabilities = vim.lsp.protocol.make_client_capabilities()
-- capabilities = require('cmp_nvim_lsp').default_capabilities(capabilities)

-- Language servers to be installed using mason
-- https://github.com/williamboman/mason-lspconfig.nvim#available-lsp-servers
local servers = {
  tsserver = {},
  -- Do not install solargraph since it's a gem. Do this per project instead.
  -- solargraph = {},

  lua_ls = {
    Lua = {
      workspace = { checkThirdParty = false },
      telemetry = { enable = false },
    },
  },
}

require('mason').setup()
require('mason-lspconfig').setup({
  ensure_installed = vim.tbl_keys(servers),

  handlers = {
    function(server_name)
      require('lspconfig')[server_name].setup {
        capabilities = capabilities,
        on_attach = on_attach,
        settings = servers[server_name],
      }
    end,
  }
})

local function source_vimscript(filepath)
  local command = 'source ' .. filepath
  vim.api.nvim_exec2(command, {output = false})
end

local home = os.getenv('HOME')
local nvim_config_path = home .. '/.config/nvim/conf/'

source_vimscript(nvim_config_path .. 'conf.vim')
source_vimscript(nvim_config_path .. 'auto.vim')

require('shortcuts')
