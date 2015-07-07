" NERDTree
noremap <silent> <leader>nt :NERDTreeToggle<Return>
noremap <silent> <leader>nf :NERDTreeFind<Return>

" clear selection
noremap <Leader>nn :noh<CR>

" Ack and Ag (grep)
noremap <Leader>g :Ack<Space>

" CtrlP and CtrlP Rails
noremap <Leader>ff        :CtrlP<CR>
noremap <Leader>f<Space>  :CtrlP<CR>
noremap <Leader>fb        :CtrlPBuffer<CR>
noremap <Leader>fm        :CtrlPModel<CR>
noremap <Leader>fc        :CtrlPController<CR>
noremap <Leader>fv        :CtrlPView<CR>
noremap <Leader>fT        :CtrlPTag<CR>
noremap <Leader>ft        :CtrlPBufTag<CR>

" snipmate
noremap <Leader>sl        :SnipMateOpenSnippetFiles<CR>

" Buffer
noremap <C-q> :bd<CR>

" save
noremap <Leader>w :w<CR>

" reload
noremap <Leader>r :e!<CR>

" rails
noremap <Leader>tt :A<CR>
noremap <Leader>t<Space> :A<CR>
noremap <Leader>ts :AS<CR>
noremap <Leader>tv :AV<CR>

" vimux
map <Leader>vq :VimuxCloseRunner<CR>
map <Leader>vz :VimuxZoomRunner<CR>
map <Leader>vi :VimuxInspectRunner<CR>
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
