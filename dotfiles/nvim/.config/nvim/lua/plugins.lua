-- This file is used to manage Neovim plugins using vim-plug.
-- Individual plugins are configured in their respective files under dotfiles/nvim/.config/nvim/conf/auto/<file>.vim

local Plug = vim.fn['plug#']
vim.call('plug#begin')

-- Libraries
Plug("MunifTanjim/nui.nvim")
Plug("nvim-lua/plenary.nvim")
Plug("nvim-tree/nvim-web-devicons")

-- UI
Plug("nvim-lualine/lualine.nvim") -- Status line
Plug("akinsho/bufferline.nvim") -- Buffer line
Plug("folke/snacks.nvim") -- A collection of QoL plugins
Plug("kevinhwang91/promise-async") -- dep: nvim-ufo
Plug("kevinhwang91/nvim-ufo") -- Code folding
Plug("luukvbaal/statuscol.nvim") -- Status column replacement (require for nvim-ufo to hide fold levels)

-- LSP
Plug('neovim/nvim-lspconfig')
Plug('j-hui/fidget.nvim') -- Status updates for LSP

-- Completion
Plug("hrsh7th/nvim-cmp")
Plug("hrsh7th/cmp-nvim-lsp")
Plug("dcampos/cmp-snippy")

-- Fuzzy finder
Plug("nvim-telescope/telescope.nvim")

-- Diagnostics
Plug("folke/trouble.nvim")

-- Colors
Plug('uga-rosa/ccc.nvim') -- Working with colors

-- Colorschemes
Plug("lifepillar/vim-solarized8")
Plug("folke/tokyonight.nvim")
Plug("catppuccin/nvim", { as = 'catppuccin' })

-- Keymap documentation
Plug("folke/which-key.nvim")

-- Snippets
Plug("dcampos/nvim-snippy") -- Snippet engine
Plug("honza/vim-snippets") -- Snippet collection

-- Git signs
Plug("lewis6991/gitsigns.nvim")

-- file system tree
Plug("nvim-neo-tree/neo-tree.nvim")

-- text objects
Plug("wellle/targets.vim")

-- Grep
Plug("mileszs/ack.vim")

-- Coding agents
Plug("github/copilot.vim")

-- Diff
Plug("lambdalisue/vim-improve-diff")
Plug("lambdalisue/vim-unified-diff")

-- Git
Plug("tpope/vim-git")
Plug("tpope/vim-fugitive")

-- Markdown
Plug("mzlogin/vim-markdown-toc")
Plug('MeanderingProgrammer/render-markdown.nvim') -- pretty markdown rendering

-- Notes
Plug("juanibiapina/notes.nvim")
--Plug("~/workspace/juanibiapina/notes.nvim") -- local path for development

-- Quickfix
Plug("itchyny/vim-qfedit")

-- Rails
Plug("tpope/vim-rails")

-- Ruby
Plug("vim-ruby/vim-ruby")
Plug("tpope/vim-bundler")
Plug("keith/rspec.vim")

-- Testing
Plug("antoinemadec/FixCursorHold.nvim")
Plug("nvim-neotest/nvim-nio")
Plug("nvim-neotest/neotest") -- interacting with tests
Plug("marilari88/neotest-vitest") -- Vitest adapter for Neotest

-- Terminal
Plug("kassio/neoterm")

-- Not organized yet
Plug("AndrewRadev/sideways.vim")
Plug("AndrewRadev/splitjoin.vim")
Plug("editorconfig/editorconfig-vim")
Plug("moll/vim-bbye")
Plug("radenling/vim-dispatch-neovim")

-- Tpope
Plug("tpope/vim-abolish") -- coerce between snake_case, camelCase, etc.
Plug("tpope/vim-capslock") -- toggle caps lock
Plug("tpope/vim-dispatch")
Plug("tpope/vim-eunuch")
Plug("tpope/vim-projectionist")
Plug("tpope/vim-repeat")
Plug("tpope/vim-rhubarb") -- github extensions for vim-fugitive
Plug("tpope/vim-sensible")
Plug("tpope/vim-surround")
Plug("tpope/vim-unimpaired")

-- Utilities
Plug("godlygeek/tabular")
Plug("wsdjeg/vim-fetch") -- gF to jump to files including line numbers

vim.call("plug#end")
