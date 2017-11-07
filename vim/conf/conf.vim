" Disable mouse
set mouse=

" Use modeline
set modeline
set modelines=2

" Use spaces instead of tabs
set expandtab
set smarttab
set tabstop=2
set shiftwidth=2

" Buffers and focus
set autowriteall
set autoread
set hidden
au FocusLost * silent! wa

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

" Add gems.tags to tags
set tags+=gems.tags

"colors
set termguicolors
let &t_8f = "\<Esc>[38;2;%lu;%lu;%lum"
let &t_8b = "\<Esc>[48;2;%lu;%lu;%lum"
set background=dark
colorscheme solarized8_dark

" enable line numbers
set number

" set distance between cursor and window border
set scrolloff=3
