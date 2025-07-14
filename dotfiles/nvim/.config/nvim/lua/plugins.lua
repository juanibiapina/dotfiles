-- This file is used to manage Neovim plugins using vim-plug.
-- Individual plugins are configured in their respective files under dotfiles/nvim/.config/nvim/conf/auto/<file>.vim

local Plug = vim.fn['plug#']
vim.call('plug#begin')

-- Libraries
Plug("MunifTanjim/nui.nvim")
Plug("nvim-lua/plenary.nvim")
Plug("nvim-tree/nvim-web-devicons")

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

-- Github CoPilot
Plug("github/copilot.vim")
Plug("CopilotC-Nvim/CopilotChat.nvim")

-- Diff
Plug("lambdalisue/vim-improve-diff")
Plug("lambdalisue/vim-unified-diff")

-- Git
Plug("tpope/vim-git")
Plug("tpope/vim-fugitive")

-- Markdown
Plug("mzlogin/vim-markdown-toc")
Plug('MeanderingProgrammer/render-markdown.nvim') -- pretty markdown rendering
Plug("iamcco/markdown-preview.nvim", { ['do'] = 'cd app && npx --yes yarn install' })

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
Plug("juanibiapina/vim-runner")

-- Terminal
Plug("kassio/neoterm")

-- Not organized yet
Plug("AndrewRadev/sideways.vim")
Plug("AndrewRadev/splitjoin.vim")
Plug("editorconfig/editorconfig-vim")
Plug("moll/vim-bbye")
Plug("ntpeters/vim-better-whitespace")
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
Plug("dkendal/nvim-alternate") -- Alternate file navigation (mainly for tests)
Plug("wsdjeg/vim-fetch") -- gF to jump to files including line numbers

vim.call("plug#end")
