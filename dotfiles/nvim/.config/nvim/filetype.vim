augroup filetypedetect

autocmd BufNewFile,BufRead *.rb setl foldmethod=indent

" disable auto insert of comment leader when pressing o or O
autocmd FileType * setlocal formatoptions-=o

augroup END
