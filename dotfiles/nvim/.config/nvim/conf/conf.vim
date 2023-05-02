" Disable mouse
set mouse=

" Set old regexp engine (vim-ruby is slow on new)
set regexpengine=1

" Set backspace bahavior in insert mode
set backspace=indent,eol,start

" Use modeline
set modeline
set modelines=2

" Enable statusbar and ruler
set laststatus=2
set ruler

" Use spaces instead of tabs
set expandtab
set smarttab
set tabstop=2
set shiftwidth=2

" Use one space after period
set nojoinspaces

" Buffers and focus
set autowriteall
set autoread
set hidden
au FocusLost * silent! wall
au BufHidden * silent! write

" Enable syntax highligh
syntax on

" Use filetype plugin
filetype off
filetype indent plugin on

" Disable swap files
set noswf

" Set the undo to have a thousand entries
set undolevels=1000

" Improve the search
set ignorecase smartcase showmatch hlsearch incsearch

" Enable break indent
set breakindent

" Add gems.tags to tags
set tags+=gems.tags

"colors
set termguicolors
let &t_8f = "\<Esc>[38;2;%lu;%lu;%lum"
let &t_8b = "\<Esc>[48;2;%lu;%lu;%lum"
set background=dark
colorscheme solarized8

" set distance between cursor and window border
set scrolloff=3

" decrease update time
set updatetime=200

" decrease timeout for key sequences
set timeoutlen=500
