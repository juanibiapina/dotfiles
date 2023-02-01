augroup filetypedetect

autocmd BufNewFile,BufRead *.rb setl foldmethod=indent
autocmd BufNewFile,BufRead *.cap setf ruby

" disable auto insert of comment leader
autocmd FileType * setlocal formatoptions-=c formatoptions-=r formatoptions-=o

augroup END
