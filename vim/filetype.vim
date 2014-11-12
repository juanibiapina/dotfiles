augroup filetypedetect

autocmd BufNewFile,BufRead *.rb setl foldmethod=indent
autocmd BufNewFile,BufRead *.cap setf ruby

augroup END
