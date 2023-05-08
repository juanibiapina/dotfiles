-- Disable mouse
vim.o.mouse = ""

-- Set old regexp engine (vim-ruby is slow on new)
vim.o.regexpengine = 1

-- Sync clipboard between OS and Neovim.
vim.o.clipboard = 'unnamedplus'

-- Set backspace bahavior in insert mode
vim.o.backspace = "indent,eol,start"

-- Use modeline
vim.o.modeline = true
vim.o.modelines = 2

-- Enable statusbar and ruler
vim.o.laststatus = 2
vim.o.ruler = true

-- Use spaces instead of tabs
vim.o.expandtab = true
vim.o.smarttab = true
vim.o.tabstop = 2
vim.o.shiftwidth = 2

-- Use one space after period
vim.o.joinspaces = false

-- Buffers and focus
vim.o.autowriteall = true
vim.o.autoread = true
vim.o.hidden = true
vim.cmd [[autocmd FocusLost * silent! wall]]
vim.cmd [[autocmd BufHidden * silent! write]]

-- Enable syntax highligh
vim.cmd [[syntax on]]

-- Use filetype plugin
vim.cmd [[filetype off]]
vim.cmd [[filetype indent plugin on]]

-- Disable swap files
vim.o.swapfile = false

-- Set the undo to have a thousand entries
vim.o.undolevels = 1000

-- Improve the search
vim.o.ignorecase = true
vim.o.smartcase = true
vim.o.showmatch = true
vim.o.hlsearch = true
vim.o.incsearch = true

-- Enable break indent
vim.o.breakindent = true

--colors
vim.o.termguicolors = true
vim.cmd [[let &t_8f = "\<Esc>[38;2;%lu;%lu;%lum"]]
vim.cmd [[let &t_8b = "\<Esc>[48;2;%lu;%lu;%lum"]]
vim.o.background = "dark"
vim.cmd [[colorscheme solarized8]]

-- set distance between cursor and window border
vim.o.scrolloff = 3

-- decrease update time
vim.o.updatetime = 200

-- decrease timeout for key sequences
vim.o.timeoutlen = 500
