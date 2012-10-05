" Use F2 to open NERDTree
noremap <silent> <F2> :NERDTreeToggle<Return>

" FuzzyFinder mappings
noremap <Leader>F  :FufFile **/<CR>
noremap <Leader>b  :FufBuffer<CR>

" Rails mappings
noremap <Leader>m :Rmodel<Space>
noremap <Leader>m<Space> :Rmodel<Space>
noremap <Leader>ms :RSmodel<Space>
noremap <Leader>mv :RVmodel<Space>

noremap <Leader>c :Rcontroller<Space>
noremap <Leader>c<Space> :Rcontroller<Space>
noremap <Leader>cs :RScontroller<Space>
noremap <Leader>cv :RVcontroller<Space>

noremap <Leader>v :Rview<Space>
noremap <Leader>v<Space> :Rview<Space>
noremap <Leader>vs :RSview<Space>
noremap <Leader>vv :RVview<Space>

noremap <Leader>j :Rjavascript<Space>
noremap <Leader>j<Space> :Rjavascript<Space>
noremap <Leader>Js :RSjavascript<Space>
noremap <Leader>Jv :RVjavascript<Space>

noremap <Leader>t :A<CR>
noremap <Leader>t<Space> :A<CR>
noremap <Leader>ts :AS<CR>
noremap <Leader>tv :AV<CR>

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

" save
noremap <Leader>w :w<CR>
