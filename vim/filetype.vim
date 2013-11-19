augroup filetypedetect

autocmd BufNewFile,BufRead *.cap setf ruby
autocmd BufNewFile,BufReadPost *.coffee setl foldmethod=indent nofoldenable

augroup END
