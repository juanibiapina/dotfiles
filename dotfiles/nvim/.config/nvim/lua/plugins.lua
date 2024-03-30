local Plug = vim.fn['plug#']
vim.call('plug#begin')

-- LSP
Plug('neovim/nvim-lspconfig')
Plug('j-hui/fidget.nvim') -- Status updates for LSP

-- Completion
Plug("hrsh7th/nvim-cmp")
Plug("hrsh7th/cmp-nvim-lsp")
Plug("dcampos/nvim-snippy")
Plug("dcampos/cmp-snippy")

-- Fuzzy finder
Plug("nvim-telescope/telescope.nvim")
Plug("nvim-lua/plenary.nvim")

-- Colors
Plug("lifepillar/vim-solarized8")

-- Keymap documentation
Plug("folke/which-key.nvim")

-- Snippets
Plug("honza/vim-snippets")

-- Git signs
Plug("lewis6991/gitsigns.nvim")

-- file system tree
Plug("juanibiapina/vim-lighttree")

-- text objects
Plug("wellle/targets.vim")

-- Grep
Plug("mileszs/ack.vim")

-- Github CoPilot
Plug("github/copilot.vim")

-- Diff
Plug("lambdalisue/vim-improve-diff")
Plug("lambdalisue/vim-unified-diff")

-- Git
Plug("tpope/vim-git")
Plug("tpope/vim-fugitive")

-- Quickfix
Plug("itchyny/vim-qfedit")

-- Rails
Plug("tpope/vim-rails")

-- Ruby
Plug("vim-ruby/vim-ruby")
Plug("ngmy/vim-rubocop")
Plug("tpope/vim-bundler")
Plug("keith/rspec.vim")

-- Testing
Plug("juanibiapina/vim-runner")

-- Not organized yet
Plug("AndrewRadev/sideways.vim")
Plug("AndrewRadev/splitjoin.vim")
Plug("editorconfig/editorconfig-vim")
Plug("godlygeek/tabular")
Plug("kassio/neoterm")
Plug("kopischke/vim-fetch")
Plug("moll/vim-bbye")
Plug("ntpeters/vim-better-whitespace")
Plug("radenling/vim-dispatch-neovim")
Plug("sunaku/vim-shortcut")

-- Tpope
Plug("tpope/vim-abolish")
Plug("tpope/vim-capslock")
Plug("tpope/vim-dispatch")
Plug("tpope/vim-eunuch")
Plug("tpope/vim-projectionist")
Plug("tpope/vim-repeat")
Plug("tpope/vim-rhubarb")
Plug("tpope/vim-sensible")
Plug("tpope/vim-sleuth")
Plug("tpope/vim-surround")
Plug("tpope/vim-unimpaired")

vim.call("plug#end")
