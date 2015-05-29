" NERDTree
noremap <silent> <leader>e :NERDTreeToggle<Return>

" Ack and Ag (grep)
noremap <Leader>g :Ag<Space>

" CtrlP and CtrlP Rails
noremap <Leader>ff        :CtrlP<CR>
noremap <Leader>f<Space>  :CtrlP<CR>
noremap <Leader>fb        :CtrlPBuffer<CR>
noremap <Leader>fm        :CtrlPModel<CR>
noremap <Leader>fc        :CtrlPController<CR>
noremap <Leader>fv        :CtrlPView<CR>
noremap <Leader>ft        :CtrlPTag<CR>

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
"noremap <Leader>t<Space> :A<CR>
"noremap <Leader>ts :AS<CR>
"noremap <Leader>tv :AV<CR>

" vimux
map <Leader>vq :VimuxCloseRunner<CR>
map <Leader>vz :VimuxZoomRunner<CR>
map <Leader>vp :VimuxPromptCommand<CR>
map <Leader>vl :VimuxRunLastCommand<CR>
map <Leader>vx :VimuxInterruptRunner<CR>

" turbux
map <leader>vt <Plug>SendTestToTmux
map <leader>vT <Plug>SendFocusedTestToTmux

" rubocop
noremap <Leader>l :RuboCop<CR>

" tagbar
noremap <silent> <leader>o :Tagbar<CR>
