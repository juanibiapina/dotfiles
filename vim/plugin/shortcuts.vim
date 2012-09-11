" Use F2 to open NERDTree
noremap <silent> <F2> :NERDTreeToggle<Return>

" FuzzyFinder mappings
noremap <silent><M-S-f>  :FufFile **/<CR>
noremap <silent><M-S-p>  :FufBuffer<CR>

" Rails mappings
noremap <M-S-m> :Rmodel<Space>
noremap <M-S-c> :Rcontroller<Space>
noremap <M-S-v> :Rview<Space>
noremap <M-S-e> :Rextract<Space>
noremap <M-S-j> :Rjavascript<Space>
noremap <F3> :A<CR>
noremap <F4> :R<CR>

" Buffer mappings
noremap <C-q> :bd<CR>

" Set mapping to navigate between open split windows
noremap <C-h> <C-w><Left>
noremap <C-j> <C-w><Down>
noremap <C-k> <C-w><Up>
noremap <C-l> <C-w><Right>
