local Plug = vim.fn['plug#']
vim.call('plug#begin')

-- Libraries
Plug("MunifTanjim/nui.nvim")
Plug("nvim-lua/plenary.nvim")
Plug("kyazdani42/nvim-web-devicons")

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

-- Colorscheme
Plug("lifepillar/vim-solarized8")

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
Plug("godlygeek/tabular")
Plug("kopischke/vim-fetch")
Plug("moll/vim-bbye")
Plug("ntpeters/vim-better-whitespace")
Plug("radenling/vim-dispatch-neovim")

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
