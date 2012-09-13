" Use F2 to open NERDTree
noremap <silent> <F2> :NERDTreeToggle<Return>

" FuzzyFinder mappings
noremap <Leader>F  :FufFile **/<CR>
noremap <Leader>b  :FufBuffer<CR>

" Rails mappings
noremap <Leader>m :Rmodel<Space>
noremap <Leader>Ms :RSmodel<Space>
noremap <Leader>Mv :RVmodel<Space>

noremap <Leader>c :Rcontroller<Space>
noremap <Leader>Cs :RScontroller<Space>
noremap <Leader>Cv :RVcontroller<Space>

noremap <Leader>v :Rview<Space>
noremap <Leader>Vs :RSview<Space>
noremap <Leader>Vv :RVview<Space>

noremap <Leader>j :Rjavascript<Space>
noremap <Leader>Js :RSjavascript<Space>
noremap <Leader>Jv :RVjavascript<Space>

noremap <Leader>t :A<CR>
noremap <Leader>Ts :AS<CR>
noremap <Leader>Tv :AV<CR>

noremap <Leader>e :Rextract<Space>
noremap <Leader>f :find<Space>

noremap <F4> :R<CR>

" Buffer mappings
noremap <C-q> :bd<CR>

" Set mapping to navigate between open split windows
noremap <C-h> <C-w><Left>
noremap <C-j> <C-w><Down>
noremap <C-k> <C-w><Up>
noremap <C-l> <C-w><Right>

" noh
noremap <Leader>n :noh<CR>
