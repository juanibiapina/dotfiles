" Use F2 to open NERDTree
noremap <silent> <F2> :NERDTreeToggle<Return>

" FuzzyFinder mappings
noremap <silent><M-S-f>  :FufFile **/<CR>
noremap <silent><M-S-p>  :FufBuffer<CR>

" Rails mappings
noremap <Leader>m :Rmodel<Space>
noremap <Leader>c :Rcontroller<Space>
noremap <Leader>v :Rview<Space>
noremap <Leader>e :Rextract<Space>
noremap <Leader>j :Rjavascript<Space>
noremap <Leader>f :find<Space>
noremap <Leader>t :RVunittest<CR>
noremap <F3> :A<CR>
noremap <F4> :R<CR>

" Buffer mappings
noremap <C-q> :bd<CR>

" Set mapping to navigate between open split windows
noremap <C-h> <C-w><Left>
noremap <C-j> <C-w><Down>
noremap <C-k> <C-w><Up>
noremap <C-l> <C-w><Right>
