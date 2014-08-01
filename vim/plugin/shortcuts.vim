" NERDTree
noremap <silent> <F2> :NERDTreeToggle<Return>

" Ack and Ag (grep)
noremap <Leader>g :Ag<Space>

" CtrlP and CtrlP Rails
noremap <Leader>f  :CtrlP<CR>
noremap <Leader>b  :CtrlPBuffer<CR>
noremap <Leader>m :CtrlPModel<CR>
noremap <Leader>c :CtrlPController<CR>
noremap <Leader>v :CtrlPView<CR>

" Buffer
noremap <C-q> :bd<CR>

" noh
noremap <Leader>n :noh<CR>

" save
noremap <Leader>w :w<CR>

" reload
noremap <Leader>r :e!<CR>

" rails
noremap <Leader>t :A<CR>
noremap <Leader>t<Space> :A<CR>
noremap <Leader>ts :AS<CR>
noremap <Leader>tv :AV<CR>

" rubocop
noremap <Leader>l :RuboCop<CR>
