" Use F2 to open NERDTree
noremap <silent> <F2> :NERDTreeToggle<Return>

" FuzzyFinder mappings
noremap <Leader>F  :FufFile **/<CR>
noremap <Leader>b  :FufBuffer<CR>

" Rails mappings
noremap <Leader>mm :Rmodel<Space>
noremap <Leader>ms :RSmodel<Space>
noremap <Leader>mv :RVmodel<Space>

noremap <Leader>cc :Rcontroller<Space>
noremap <Leader>cs :RScontroller<Space>
noremap <Leader>cv :RVcontroller<Space>

noremap <Leader>vv :Rview<Space>
noremap <Leader>vs :RSview<Space>
noremap <Leader>vv :RVview<Space>

noremap <Leader>jj :Rjavascript<Space>
noremap <Leader>Js :RSjavascript<Space>
noremap <Leader>Jv :RVjavascript<Space>

noremap <Leader>tt :A<CR>
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
