let NERDTreeIgnore = ['\.pyc$', '__init__.py', 'compiled']

" auto open nerdtree if no file is specified when opening vim
autocmd StdinReadPre * let s:std_in=1
autocmd VimEnter * if argc() == 0 && !exists("s:std_in") | NERDTree | endif
