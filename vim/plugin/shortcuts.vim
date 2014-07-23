" NERDTree
noremap <silent> <F2> :NERDTreeToggle<Return>

" Ack
noremap <Leader>g :Ack<Space>

" CtrlP
noremap <Leader>f  :CtrlP<CR>
noremap <Leader>b  :CtrlPBuffer<CR>

" Buffer
noremap <C-q> :bd<CR>

" noh
noremap <Leader>n :noh<CR>

" save
noremap <Leader>w :w<CR>

" reload
noremap <Leader>r :e!<CR>

" rails
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

noremap <Leader>t :A<CR>
noremap <Leader>t<Space> :A<CR>
noremap <Leader>ts :AS<CR>
noremap <Leader>tv :AV<CR>
